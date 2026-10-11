import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Teacher } from './entities/teacher.entity';
import { Department } from '../departments/entities/department.entity';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { ListTeachersQueryDto } from './dto/list-teachers-query.dto';
import { TeachersRepository, TeacherView } from './teachers.repository';
import { TransactionService } from '../../common/database/transaction.service';
import { UserProvisioningService } from '../users/user-provisioning.service';
import { Paginated } from '../../common/dto/pagination-query.dto';

@Injectable()
export class TeachersService {
  constructor(
    private readonly repository: TeachersRepository,
    private readonly transactions: TransactionService,
    private readonly provisioning: UserProvisioningService,
  ) {}

  async list(query: ListTeachersQueryDto): Promise<Paginated<TeacherView>> {
    const { items, total } = await this.repository.findPage(query);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async get(userId: number): Promise<TeacherView> {
    const teacher = await this.repository.findView(userId);
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    return teacher;
  }

  /**
   * Creates the teacher in one transaction, reusing the user when the CPF is
   * already registered. Teachers are not issued a matrícula: they sign in
   * with their CPF (an existing matrícula is kept untouched).
   */
  async create(dto: CreateTeacherDto): Promise<TeacherView> {
    const userId = await this.transactions.run(async (manager) => {
      await this.requireDepartment(manager, dto.departmentId);

      const { user } = await this.provisioning.findOrCreate(manager, dto);

      const teachers = manager.getRepository(Teacher);
      if (await teachers.existsBy({ userId: user.id })) {
        throw new ConflictException('This person is already a teacher');
      }

      await teachers.insert({
        userId: user.id,
        departmentId: dto.departmentId,
        title: dto.title,
        status: 'active',
      });
      return user.id;
    });

    return this.get(userId);
  }

  async update(userId: number, dto: UpdateTeacherDto): Promise<TeacherView> {
    await this.transactions.run(async (manager) => {
      const teachers = manager.getRepository(Teacher);
      if (!(await teachers.existsBy({ userId }))) {
        throw new NotFoundException('Teacher not found');
      }
      if (dto.departmentId !== undefined) {
        await this.requireDepartment(manager, dto.departmentId);
      }

      const patch: Partial<Teacher> = {};
      if (dto.departmentId !== undefined) patch.departmentId = dto.departmentId;
      if (dto.title !== undefined) patch.title = dto.title;
      if (dto.status !== undefined) patch.status = dto.status;
      if (Object.keys(patch).length > 0) {
        await teachers.update({ userId }, patch);
      }
    });

    return this.get(userId);
  }

  /** Removes only the teacher profile; the user stays. Prefer inactivating. */
  async remove(userId: number): Promise<void> {
    if (!(await this.repository.delete(userId))) {
      throw new NotFoundException('Teacher not found');
    }
  }

  private async requireDepartment(
    manager: EntityManager,
    departmentId: number,
  ): Promise<void> {
    if (!(await manager.getRepository(Department).existsBy({ id: departmentId }))) {
      throw new BadRequestException('Department not found');
    }
  }
}
