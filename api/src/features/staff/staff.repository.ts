import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from './entities/staff.entity';
import {
  ProfileStatus,
  StaffRole,
} from '../../common/domain/domain.constants';

export interface StaffView {
  userId: number;
  cpf: string;
  name: string;
  email: string;
  registrationNumber: string | null;
  role: StaffRole;
  status: ProfileStatus;
}

export interface StaffFilters {
  role?: StaffRole;
  status?: ProfileStatus;
  q?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class StaffRepository {
  constructor(
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
  ) {}

  async findPage(
    filters: StaffFilters,
  ): Promise<{ items: StaffView[]; total: number }> {
    const query = this.staff
      .createQueryBuilder('staff')
      .innerJoinAndSelect('staff.user', 'user');

    if (filters.role) {
      query.andWhere('staff.role = :role', { role: filters.role });
    }
    if (filters.status) {
      query.andWhere('staff.status = :status', { status: filters.status });
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

  async findView(userId: number): Promise<StaffView | null> {
    const row = await this.staff
      .createQueryBuilder('staff')
      .innerJoinAndSelect('staff.user', 'user')
      .where('staff.userId = :userId', { userId })
      .getOne();
    return row ? toView(row) : null;
  }
}

function toView(row: Staff): StaffView {
  return {
    userId: row.userId,
    cpf: row.user.cpf,
    name: row.user.name,
    email: row.user.email,
    registrationNumber: row.user.registrationNumber,
    role: row.role,
    status: row.status,
  };
}
