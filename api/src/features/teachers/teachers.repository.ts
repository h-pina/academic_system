import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teacher } from './entities/teacher.entity';
import {
  ProfileStatus,
  TeacherTitle,
} from '../../common/domain/domain.constants';

export interface TeacherView {
  userId: number;
  cpf: string;
  name: string;
  email: string;
  registrationNumber: string | null;
  departmentId: number;
  departmentName: string;
  title: TeacherTitle;
  status: ProfileStatus;
}

export interface TeacherFilters {
  departmentId?: number;
  status?: ProfileStatus;
  q?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class TeachersRepository {
  constructor(
    @InjectRepository(Teacher)
    private readonly teachers: Repository<Teacher>,
  ) {}

  async findPage(
    filters: TeacherFilters,
  ): Promise<{ items: TeacherView[]; total: number }> {
    const query = this.baseQuery();

    if (filters.departmentId !== undefined) {
      query.andWhere('teacher.departmentId = :departmentId', {
        departmentId: filters.departmentId,
      });
    }
    if (filters.status) {
      query.andWhere('teacher.status = :status', { status: filters.status });
    }
    const term = filters.q?.trim();
    if (term) {
      const like = `%${term.replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
      query.andWhere(
        `(user.name LIKE :like ESCAPE '\\' OR user.cpf LIKE :like ESCAPE '\\')`,
        { like },
      );
    }

    const [rows, total] = await query
      .orderBy('user.name', 'ASC')
      .skip((filters.page - 1) * filters.pageSize)
      .take(filters.pageSize)
      .getManyAndCount();

    return { items: rows.map(toView), total };
  }

  async findView(userId: number): Promise<TeacherView | null> {
    const row = await this.baseQuery()
      .where('teacher.userId = :userId', { userId })
      .getOne();
    return row ? toView(row) : null;
  }

  async delete(userId: number): Promise<boolean> {
    const result = await this.teachers.delete({ userId });
    return (result.affected ?? 0) > 0;
  }

  private baseQuery() {
    return this.teachers
      .createQueryBuilder('teacher')
      .innerJoinAndSelect('teacher.user', 'user')
      .innerJoinAndSelect('teacher.department', 'department');
  }
}

function toView(row: Teacher): TeacherView {
  return {
    userId: row.userId,
    cpf: row.user.cpf,
    name: row.user.name,
    email: row.user.email,
    registrationNumber: row.user.registrationNumber,
    departmentId: row.departmentId,
    departmentName: row.department.name,
    title: row.title,
    status: row.status,
  };
}
