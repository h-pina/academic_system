import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Subject } from './entities/subject.entity';
import { SubjectPrerequisite } from './entities/subject-prerequisite.entity';
import { CurriculumItem } from '../courses/entities/curriculum-item.entity';
import {
  CreateSubjectDto,
  ListSubjectsQueryDto,
  SetPrerequisitesDto,
  UpdateSubjectDto,
} from './dto/subject.dto';
import { buildGraph, wouldCreateCycle } from './prerequisite-graph';
import { TransactionService } from '../../common/database/transaction.service';
import { Paginated } from '../../common/dto/pagination-query.dto';
import { ResolvedSort, resolveSort } from '../../common/dto/sort';

const SORT_COLUMNS: Record<string, string> = {
  code: 'subject.code',
  name: 'subject.name',
  workloadHours: 'subject.workloadHours',
};

const DEFAULT_SORT: ResolvedSort = { column: 'subject.code', direction: 'ASC' };

export interface SubjectSummary {
  id: number;
  code: string;
  name: string;
  workloadHours: number;
}

export interface SubjectView extends SubjectSummary {
  description: string | null;
  prerequisites: SubjectSummary[];
  /** Number of courses whose curriculum includes this subject. */
  courseCount: number;
}

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
    @InjectRepository(SubjectPrerequisite)
    private readonly prerequisites: Repository<SubjectPrerequisite>,
    @InjectRepository(CurriculumItem)
    private readonly curriculum: Repository<CurriculumItem>,
    private readonly transactions: TransactionService,
  ) {}

  async list(query: ListSubjectsQueryDto): Promise<Paginated<SubjectView>> {
    const builder = this.subjects.createQueryBuilder('subject');

    if (query.courseId !== undefined) {
      builder.andWhere(
        `subject.id IN (SELECT item.subject_id FROM curriculum_items item WHERE item.course_id = :courseId)`,
        { courseId: query.courseId },
      );
    }
    const term = query.q?.trim();
    if (term) {
      const like = `%${term.replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
      builder.andWhere(
        `(subject.name LIKE :like ESCAPE '\\' OR subject.code LIKE :like ESCAPE '\\')`,
        { like },
      );
    }

    const sort = resolveSort(query.sort, query.order, SORT_COLUMNS, DEFAULT_SORT);
    builder.orderBy(sort.column, sort.direction);
    if (sort.column !== 'subject.code') {
      builder.addOrderBy('subject.code', 'ASC');
    }

    const [rows, total] = await builder
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    const items = await this.toViews(rows);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async get(id: number): Promise<SubjectView> {
    const subject = await this.subjects.findOneBy({ id });
    if (!subject) {
      throw new NotFoundException('Disciplina não encontrada');
    }
    return (await this.toViews([subject]))[0];
  }

  async create(dto: CreateSubjectDto): Promise<SubjectView> {
    const code = dto.code.toUpperCase();
    await this.assertUniqueCode(code);

    const saved = await this.subjects.save(
      this.subjects.create({
        code,
        name: dto.name.trim(),
        workloadHours: dto.workloadHours,
        description: dto.description?.trim() || null,
      }),
    );
    return this.get(saved.id);
  }

  async update(id: number, dto: UpdateSubjectDto): Promise<SubjectView> {
    if (!(await this.subjects.existsBy({ id }))) {
      throw new NotFoundException('Disciplina não encontrada');
    }
    if (dto.code !== undefined) {
      await this.assertUniqueCode(dto.code.toUpperCase(), id);
    }

    const patch: Partial<Subject> = {};
    if (dto.code !== undefined) patch.code = dto.code.toUpperCase();
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.workloadHours !== undefined) patch.workloadHours = dto.workloadHours;
    if (dto.description !== undefined) {
      patch.description = dto.description.trim() || null;
    }
    if (Object.keys(patch).length > 0) {
      await this.subjects.update({ id }, patch);
    }
    return this.get(id);
  }

  /**
   * A subject that is in a curriculum or is a prerequisite of another
   * subject cannot be removed. Its own prerequisite links go with it.
   */
  async remove(id: number): Promise<void> {
    if (!(await this.subjects.existsBy({ id }))) {
      throw new NotFoundException('Disciplina não encontrada');
    }

    const [courses, dependents] = await Promise.all([
      this.curriculum.countBy({ subjectId: id }),
      this.prerequisites.countBy({ prerequisiteId: id }),
    ]);
    if (courses > 0) {
      throw new ConflictException(
        `A disciplina faz parte de ${courses} matriz(es) curricular(es); remova-a delas antes`,
      );
    }
    if (dependents > 0) {
      throw new ConflictException(
        `A disciplina é pré-requisito de ${dependents} outra(s) disciplina(s); remova esses vínculos antes`,
      );
    }
    await this.subjects.delete({ id });
  }

  /**
   * Replaces the whole set of prerequisites of a subject. Rejects unknown
   * subjects, a subject requiring itself, and any cycle in the graph.
   */
  async setPrerequisites(
    id: number,
    dto: SetPrerequisitesDto,
  ): Promise<SubjectView> {
    await this.transactions.run(async (manager) => {
      const subjects = manager.getRepository(Subject);
      const links = manager.getRepository(SubjectPrerequisite);

      if (!(await subjects.existsBy({ id }))) {
        throw new NotFoundException('Disciplina não encontrada');
      }

      const ids = dto.prerequisiteIds;
      if (ids.includes(id)) {
        throw new BadRequestException('Uma disciplina não pode ser pré-requisito dela mesma');
      }
      if (ids.length > 0) {
        const found = await subjects.countBy({ id: In(ids) });
        if (found !== ids.length) {
          throw new BadRequestException('Algumas disciplinas informadas como pré-requisito não existem');
        }

        const graph = buildGraph(await links.find());
        if (wouldCreateCycle(graph, id, ids)) {
          throw new BadRequestException(
            'Estes pré-requisitos criariam um ciclo de dependência',
          );
        }
      }

      await links.delete({ subjectId: id });
      if (ids.length > 0) {
        await links.insert(
          ids.map((prerequisiteId) => ({ subjectId: id, prerequisiteId })),
        );
      }
    });

    return this.get(id);
  }

  private async assertUniqueCode(code: string, ignoreId?: number): Promise<void> {
    const same = await this.subjects.findOneBy({ code });
    if (same && same.id !== ignoreId) {
      throw new ConflictException('Já existe uma disciplina com este código');
    }
  }

  private async toViews(subjects: Subject[]): Promise<SubjectView[]> {
    if (subjects.length === 0) {
      return [];
    }
    const ids = subjects.map((subject) => subject.id);

    const links = await this.prerequisites.find({
      where: { subjectId: In(ids) },
      relations: { prerequisite: true },
    });
    const used = await this.curriculum
      .createQueryBuilder('item')
      .select('item.subjectId', 'subjectId')
      .addSelect('COUNT(*)', 'count')
      .where('item.subjectId IN (:...ids)', { ids })
      .groupBy('item.subjectId')
      .getRawMany<{ subjectId: number; count: string }>();
    const usage = new Map(used.map((row) => [Number(row.subjectId), Number(row.count)]));

    return subjects.map((subject) => ({
      id: subject.id,
      code: subject.code,
      name: subject.name,
      workloadHours: subject.workloadHours,
      description: subject.description,
      prerequisites: links
        .filter((link) => link.subjectId === subject.id)
        .map((link) => toSummary(link.prerequisite))
        .sort((a, b) => a.code.localeCompare(b.code)),
      courseCount: usage.get(subject.id) ?? 0,
    }));
  }
}

export function toSummary(subject: Subject): SubjectSummary {
  return {
    id: subject.id,
    code: subject.code,
    name: subject.name,
    workloadHours: subject.workloadHours,
  };
}
