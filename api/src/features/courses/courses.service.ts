import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CurriculumItem } from './entities/curriculum-item.entity';
import { Department } from '../departments/entities/department.entity';
import { Student } from '../students/entities/student.entity';
import {
  CreateCourseDto,
  ListCoursesQueryDto,
  UpdateCourseDto,
} from './dto/course.dto';
import { Paginated } from '../../common/dto/pagination-query.dto';
import { CourseStatus } from '../../common/domain/domain.constants';
import { ResolvedSort, resolveSort } from '../../common/dto/sort';

const SORT_COLUMNS: Record<string, string> = {
  name: 'course.name',
  code: 'course.code',
  department: 'department.name',
  totalSemesters: 'course.totalSemesters',
  status: 'course.status',
};

const DEFAULT_SORT: ResolvedSort = { column: 'course.name', direction: 'ASC' };

export interface CourseView {
  id: number;
  name: string;
  code: string;
  departmentId: number;
  departmentName: string;
  totalSemesters: number;
  status: CourseStatus;
  studentCount: number;
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Department)
    private readonly departments: Repository<Department>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
    @InjectRepository(CurriculumItem)
    private readonly curriculum: Repository<CurriculumItem>,
  ) {}

  async list(query: ListCoursesQueryDto): Promise<Paginated<CourseView>> {
    const builder = this.courses
      .createQueryBuilder('course')
      .innerJoinAndSelect('course.department', 'department');

    if (query.departmentId !== undefined) {
      builder.andWhere('course.departmentId = :departmentId', {
        departmentId: query.departmentId,
      });
    }
    if (query.status) {
      builder.andWhere('course.status = :status', { status: query.status });
    }
    const term = query.q?.trim();
    if (term) {
      const like = `%${term.replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
      builder.andWhere(
        `(course.name LIKE :like ESCAPE '\\' OR course.code LIKE :like ESCAPE '\\')`,
        { like },
      );
    }

    const sort = resolveSort(query.sort, query.order, SORT_COLUMNS, DEFAULT_SORT);
    builder.orderBy(sort.column, sort.direction);
    if (sort.column !== 'course.name') {
      builder.addOrderBy('course.name', 'ASC');
    }

    const [rows, total] = await builder
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize)
      .getManyAndCount();

    const items = await Promise.all(rows.map((row) => this.toView(row)));
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async get(id: number): Promise<CourseView> {
    const course = await this.courses.findOne({
      where: { id },
      relations: { department: true },
    });
    if (!course) {
      throw new NotFoundException('Curso não encontrado');
    }
    return this.toView(course);
  }

  async create(dto: CreateCourseDto): Promise<CourseView> {
    await this.requireDepartment(dto.departmentId);
    const name = dto.name.trim();
    const code = dto.code.toUpperCase();
    await this.assertUniqueCode(code);

    const saved = await this.courses.save(
      this.courses.create({
        name,
        code,
        departmentId: dto.departmentId,
        totalSemesters: dto.totalSemesters,
        status: dto.status ?? 'active',
      }),
    );
    return this.get(saved.id);
  }

  async update(id: number, dto: UpdateCourseDto): Promise<CourseView> {
    const current = await this.courses.findOneBy({ id });
    if (!current) {
      throw new NotFoundException('Curso não encontrado');
    }

    if (dto.departmentId !== undefined) {
      await this.requireDepartment(dto.departmentId);
    }
    if (dto.code !== undefined) {
      await this.assertUniqueCode(dto.code.toUpperCase(), id);
    }
    if (
      dto.totalSemesters !== undefined &&
      dto.totalSemesters < current.totalSemesters
    ) {
      const beyond = await this.curriculum
        .createQueryBuilder('item')
        .where('item.courseId = :id', { id })
        .andWhere('item.semester > :max', { max: dto.totalSemesters })
        .getCount();
      if (beyond > 0) {
        throw new ConflictException(
          `${beyond} item(ns) da matriz estão após o semestre ${dto.totalSemesters}; mova-os antes`,
        );
      }
    }

    const patch: Partial<Course> = {};
    if (dto.name !== undefined) patch.name = dto.name.trim();
    if (dto.code !== undefined) patch.code = dto.code.toUpperCase();
    if (dto.departmentId !== undefined) patch.departmentId = dto.departmentId;
    if (dto.totalSemesters !== undefined) patch.totalSemesters = dto.totalSemesters;
    if (dto.status !== undefined) patch.status = dto.status;
    if (Object.keys(patch).length > 0) {
      await this.courses.update({ id }, patch);
    }
    return this.get(id);
  }

  /** A course that still has students cannot be removed: inactivate it. */
  async remove(id: number): Promise<void> {
    if (!(await this.courses.existsBy({ id }))) {
      throw new NotFoundException('Curso não encontrado');
    }
    const students = await this.students.countBy({ courseId: id });
    if (students > 0) {
      throw new ConflictException(
        `O curso ainda tem ${students} aluno(s); inative-o em vez de excluir`,
      );
    }
    await this.courses.delete({ id });
  }

  private async requireDepartment(departmentId: number): Promise<void> {
    if (!(await this.departments.existsBy({ id: departmentId }))) {
      throw new BadRequestException('Departamento não encontrado');
    }
  }

  private async assertUniqueCode(code: string, ignoreId?: number): Promise<void> {
    const same = await this.courses.findOneBy({ code });
    if (same && same.id !== ignoreId) {
      throw new ConflictException('Já existe um curso com este código');
    }
  }

  private async toView(course: Course): Promise<CourseView> {
    return {
      id: course.id,
      name: course.name,
      code: course.code,
      departmentId: course.departmentId,
      departmentName: course.department.name,
      totalSemesters: course.totalSemesters,
      status: course.status,
      studentCount: await this.students.countBy({ courseId: course.id }),
    };
  }
}
