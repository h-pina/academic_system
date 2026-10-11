import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from './entities/student.entity';
import { StudentStatus } from '../../common/domain/domain.constants';
import { ResolvedSort, SortOrder, resolveSort } from '../../common/dto/sort';

const SORT_COLUMNS: Record<string, string> = {
  name: 'user.name',
  registrationNumber: 'user.registrationNumber',
  course: 'course.name',
  entryYear: 'student.entryYear',
  status: 'student.status',
};

const DEFAULT_SORT: ResolvedSort = { column: 'user.name', direction: 'ASC' };

export interface StudentView {
  userId: number;
  cpf: string;
  name: string;
  email: string;
  registrationNumber: string | null;
  courseId: number;
  courseName: string;
  entryYear: number;
  status: StudentStatus;
}

export interface StudentFilters {
  courseId?: number;
  status?: StudentStatus;
  q?: string;
  sort?: string;
  order?: SortOrder;
  page: number;
  pageSize: number;
}

@Injectable()
export class StudentsRepository {
  constructor(
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
  ) {}

  async findPage(
    filters: StudentFilters,
  ): Promise<{ items: StudentView[]; total: number }> {
    const query = this.baseQuery();

    if (filters.courseId !== undefined) {
      query.andWhere('student.courseId = :courseId', {
        courseId: filters.courseId,
      });
    }
    if (filters.status) {
      query.andWhere('student.status = :status', { status: filters.status });
    }
    const term = filters.q?.trim();
    if (term) {
      const like = `%${term.replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
      query.andWhere(
        `(user.name LIKE :like ESCAPE '\\' OR user.cpf LIKE :like ESCAPE '\\' OR user.registrationNumber LIKE :like ESCAPE '\\')`,
        { like },
      );
    }

    const sort = resolveSort(filters.sort, filters.order, SORT_COLUMNS, DEFAULT_SORT);
    query.orderBy(sort.column, sort.direction);
    if (sort.column !== 'user.name') {
      query.addOrderBy('user.name', 'ASC');
    }

    const [rows, total] = await query
      .skip((filters.page - 1) * filters.pageSize)
      .take(filters.pageSize)
      .getManyAndCount();

    return { items: rows.map(toView), total };
  }

  async findView(userId: number): Promise<StudentView | null> {
    const row = await this.baseQuery()
      .where('student.userId = :userId', { userId })
      .getOne();
    return row ? toView(row) : null;
  }

  async delete(userId: number): Promise<boolean> {
    const result = await this.students.delete({ userId });
    return (result.affected ?? 0) > 0;
  }

  private baseQuery() {
    return this.students
      .createQueryBuilder('student')
      .innerJoinAndSelect('student.user', 'user')
      .innerJoinAndSelect('student.course', 'course');
  }
}

function toView(row: Student): StudentView {
  return {
    userId: row.userId,
    cpf: row.user.cpf,
    name: row.user.name,
    email: row.user.email,
    registrationNumber: row.user.registrationNumber,
    courseId: row.courseId,
    courseName: row.course.name,
    entryYear: row.entryYear,
    status: row.status,
  };
}
