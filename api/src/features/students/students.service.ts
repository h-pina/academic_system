import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Student } from './entities/student.entity';
import { Course } from '../courses/entities/course.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { StudentsRepository, StudentView } from './students.repository';
import { TransactionService } from '../../common/database/transaction.service';
import { UserProvisioningService } from '../users/user-provisioning.service';
import { Paginated } from '../../common/dto/pagination-query.dto';

@Injectable()
export class StudentsService {
  constructor(
    private readonly repository: StudentsRepository,
    private readonly transactions: TransactionService,
    private readonly provisioning: UserProvisioningService,
  ) {}

  async list(query: ListStudentsQueryDto): Promise<Paginated<StudentView>> {
    const { items, total } = await this.repository.findPage(query);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async get(userId: number): Promise<StudentView> {
    const student = await this.repository.findView(userId);
    if (!student) {
      throw new NotFoundException('Aluno não encontrado');
    }
    return student;
  }

  /**
   * Creates the student in one transaction: reuses the user when the CPF is
   * already registered (e.g. a teacher), otherwise creates it without
   * password, then issues the matrícula and inserts the student row.
   */
  async create(dto: CreateStudentDto): Promise<StudentView> {
    const userId = await this.transactions.run(async (manager) => {
      await this.requireActiveCourse(manager, dto.courseId);

      const { user } = await this.provisioning.findOrCreate(manager, dto);

      const students = manager.getRepository(Student);
      if (await students.existsBy({ userId: user.id })) {
        throw new ConflictException('Esta pessoa já possui vínculo de aluno');
      }

      await this.provisioning.ensureRegistrationNumber(
        manager,
        user,
        dto.entryYear,
      );
      await students.insert({
        userId: user.id,
        courseId: dto.courseId,
        entryYear: dto.entryYear,
        status: 'active',
      });
      return user.id;
    });

    return this.get(userId);
  }

  async update(userId: number, dto: UpdateStudentDto): Promise<StudentView> {
    await this.transactions.run(async (manager) => {
      const students = manager.getRepository(Student);
      if (!(await students.existsBy({ userId }))) {
        throw new NotFoundException('Aluno não encontrado');
      }
      if (dto.courseId !== undefined) {
        await this.requireActiveCourse(manager, dto.courseId);
      }

      const patch: Partial<Student> = {};
      if (dto.courseId !== undefined) patch.courseId = dto.courseId;
      if (dto.entryYear !== undefined) patch.entryYear = dto.entryYear;
      if (dto.status !== undefined) patch.status = dto.status;
      if (Object.keys(patch).length > 0) {
        await students.update({ userId }, patch);
      }
    });

    return this.get(userId);
  }

  /** Removes only the student profile; the user and their history stay. */
  async remove(userId: number): Promise<void> {
    if (!(await this.repository.delete(userId))) {
      throw new NotFoundException('Aluno não encontrado');
    }
  }

  private async requireActiveCourse(
    manager: EntityManager,
    courseId: number,
  ): Promise<void> {
    const course = await manager.getRepository(Course).findOneBy({ id: courseId });
    if (!course) {
      throw new BadRequestException('Curso não encontrado');
    }
    if (course.status !== 'active') {
      throw new BadRequestException('O curso não está ativo');
    }
  }
}
