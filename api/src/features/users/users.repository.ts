import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { LoginIdentifier } from '../../common/utils/identifier.util';
import { Staff } from '../staff/entities/staff.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Student } from '../students/entities/student.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.users.find({ order: { name: 'ASC' } });
  }

  /** Users with no row in staff, teachers or students ("users without link"). */
  findWithoutProfile(): Promise<User[]> {
    return this.users
      .createQueryBuilder('user')
      .leftJoin(Staff, 'staff', 'staff.userId = user.id')
      .leftJoin(Teacher, 'teacher', 'teacher.userId = user.id')
      .leftJoin(Student, 'student', 'student.userId = user.id')
      .where('staff.userId IS NULL')
      .andWhere('teacher.userId IS NULL')
      .andWhere('student.userId IS NULL')
      .orderBy('user.name', 'ASC')
      .getMany();
  }

  findById(id: number): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  findByIdentifier(identifier: LoginIdentifier): Promise<User | null> {
    return this.users.findOne({
      where:
        identifier.type === 'cpf'
          ? { cpf: identifier.value }
          : { registrationNumber: identifier.value },
    });
  }

  findByCpf(cpf: string): Promise<User | null> {
    return this.users.findOne({ where: { cpf } });
  }

  async findEmailByCpf(cpf: string): Promise<string | null> {
    const user = await this.users.findOne({
      where: { cpf },
      select: { email: true },
    });
    return user?.email ?? null;
  }

  exists(cpf: string): Promise<boolean> {
    return this.users.existsBy({ cpf });
  }

  async create(user: {
    cpf: string;
    name: string;
    email: string;
    passwordHash: string | null;
  }): Promise<void> {
    await this.users.insert(user);
  }

  async updateDetails(
    cpf: string,
    data: { name: string; email: string },
  ): Promise<void> {
    await this.users.update({ cpf }, data);
  }

  async updateOwnProfile(
    cpf: string,
    data: { name: string; email: string; passwordHash?: string },
  ): Promise<void> {
    const patch: Partial<User> = { name: data.name, email: data.email };
    if (data.passwordHash) {
      patch.passwordHash = data.passwordHash;
    }
    await this.users.update({ cpf }, patch);
  }

  async updatePassword(cpf: string, passwordHash: string): Promise<void> {
    await this.users.update({ cpf }, { passwordHash });
  }

  async delete(cpf: string): Promise<void> {
    await this.users.delete({ cpf });
  }
}
