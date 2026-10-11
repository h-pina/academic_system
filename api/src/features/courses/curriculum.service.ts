import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CurriculumItem } from './entities/curriculum-item.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { SubjectPrerequisite } from '../subjects/entities/subject-prerequisite.entity';
import {
  AddCurriculumItemDto,
  UpdateCurriculumItemDto,
} from './dto/curriculum.dto';

export interface CurriculumSubject {
  subjectId: number;
  code: string;
  name: string;
  workloadHours: number;
  mandatory: boolean;
  prerequisites: { id: number; code: string; name: string }[];
}

export interface CurriculumSemester {
  semester: number;
  workloadHours: number;
  items: CurriculumSubject[];
}

export interface CurriculumView {
  courseId: number;
  courseName: string;
  totalSemesters: number;
  totalWorkloadHours: number;
  semesters: CurriculumSemester[];
}

@Injectable()
export class CurriculumService {
  constructor(
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
    @InjectRepository(CurriculumItem)
    private readonly items: Repository<CurriculumItem>,
    @InjectRepository(SubjectPrerequisite)
    private readonly prerequisites: Repository<SubjectPrerequisite>,
  ) {}

  /** The curriculum of a course, grouped by semester (ascending). */
  async get(courseId: number): Promise<CurriculumView> {
    const course = await this.requireCourse(courseId);

    const rows = await this.items.find({
      where: { courseId },
      relations: { subject: true },
    });
    const subjectIds = rows.map((row) => row.subjectId);
    const links =
      subjectIds.length > 0
        ? await this.prerequisites.find({
            where: { subjectId: In(subjectIds) },
            relations: { prerequisite: true },
          })
        : [];

    const bySemester = new Map<number, CurriculumSubject[]>();
    for (const row of rows) {
      const list = bySemester.get(row.semester) ?? [];
      list.push({
        subjectId: row.subjectId,
        code: row.subject.code,
        name: row.subject.name,
        workloadHours: row.subject.workloadHours,
        mandatory: row.mandatory,
        prerequisites: links
          .filter((link) => link.subjectId === row.subjectId)
          .map((link) => ({
            id: link.prerequisite.id,
            code: link.prerequisite.code,
            name: link.prerequisite.name,
          }))
          .sort((a, b) => a.code.localeCompare(b.code)),
      });
      bySemester.set(row.semester, list);
    }

    const semesters = [...bySemester.entries()]
      .sort(([a], [b]) => a - b)
      .map(([semester, items]) => ({
        semester,
        workloadHours: items.reduce((sum, item) => sum + item.workloadHours, 0),
        items: items.sort((a, b) => a.code.localeCompare(b.code)),
      }));

    return {
      courseId: course.id,
      courseName: course.name,
      totalSemesters: course.totalSemesters,
      totalWorkloadHours: semesters.reduce(
        (sum, semester) => sum + semester.workloadHours,
        0,
      ),
      semesters,
    };
  }

  async add(courseId: number, dto: AddCurriculumItemDto): Promise<CurriculumView> {
    const course = await this.requireCourse(courseId);
    this.assertSemester(course, dto.semester);

    if (!(await this.subjects.existsBy({ id: dto.subjectId }))) {
      throw new BadRequestException('Subject not found');
    }
    if (await this.items.existsBy({ courseId, subjectId: dto.subjectId })) {
      throw new ConflictException('This subject is already in the curriculum');
    }

    await this.items.insert({
      courseId,
      subjectId: dto.subjectId,
      semester: dto.semester,
      mandatory: dto.mandatory ?? true,
    });
    return this.get(courseId);
  }

  async update(
    courseId: number,
    subjectId: number,
    dto: UpdateCurriculumItemDto,
  ): Promise<CurriculumView> {
    const course = await this.requireCourse(courseId);
    const item = await this.items.findOneBy({ courseId, subjectId });
    if (!item) {
      throw new NotFoundException('Subject is not in this curriculum');
    }
    if (dto.semester !== undefined) {
      this.assertSemester(course, dto.semester);
    }

    const patch: Partial<CurriculumItem> = {};
    if (dto.semester !== undefined) patch.semester = dto.semester;
    if (dto.mandatory !== undefined) patch.mandatory = dto.mandatory;
    if (Object.keys(patch).length > 0) {
      await this.items.update({ id: item.id }, patch);
    }
    return this.get(courseId);
  }

  async remove(courseId: number, subjectId: number): Promise<void> {
    await this.requireCourse(courseId);
    const result = await this.items.delete({ courseId, subjectId });
    if ((result.affected ?? 0) === 0) {
      throw new NotFoundException('Subject is not in this curriculum');
    }
  }

  private assertSemester(course: Course, semester: number): void {
    if (semester > course.totalSemesters) {
      throw new BadRequestException(
        `Semester must be between 1 and ${course.totalSemesters} for this course`,
      );
    }
  }

  private async requireCourse(courseId: number): Promise<Course> {
    const course = await this.courses.findOneBy({ id: courseId });
    if (!course) {
      throw new NotFoundException('Course not found');
    }
    return course;
  }
}
