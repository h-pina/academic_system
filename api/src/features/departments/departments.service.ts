import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { Course } from '../courses/entities/course.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from './dto/department.dto';

export interface DepartmentView extends Department {
  courseCount: number;
  teacherCount: number;
}

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private readonly departments: Repository<Department>,
    @InjectRepository(Course) private readonly courses: Repository<Course>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
  ) {}

  async list(): Promise<DepartmentView[]> {
    const rows = await this.departments.find({ order: { name: 'ASC' } });
    return Promise.all(rows.map((row) => this.withCounts(row)));
  }

  async get(id: number): Promise<DepartmentView> {
    return this.withCounts(await this.require(id));
  }

  async create(dto: CreateDepartmentDto): Promise<DepartmentView> {
    const name = dto.name.trim();
    const code = dto.code.toUpperCase();
    await this.assertUnique(name, code);

    const saved = await this.departments.save(
      this.departments.create({ name, code }),
    );
    return this.withCounts(saved);
  }

  async update(id: number, dto: UpdateDepartmentDto): Promise<DepartmentView> {
    const current = await this.require(id);
    const name = dto.name?.trim() ?? current.name;
    const code = dto.code?.toUpperCase() ?? current.code;
    await this.assertUnique(name, code, id);

    await this.departments.update({ id }, { name, code });
    return this.get(id);
  }

  /** A department that still has courses or teachers cannot be removed. */
  async remove(id: number): Promise<void> {
    await this.require(id);

    const [courses, teachers] = await Promise.all([
      this.courses.countBy({ departmentId: id }),
      this.teachers.countBy({ departmentId: id }),
    ]);
    if (courses > 0 || teachers > 0) {
      throw new ConflictException(
        `O departamento ainda tem ${courses} curso(s) e ${teachers} professor(es); mova-os ou remova-os antes`,
      );
    }
    await this.departments.delete({ id });
  }

  private async require(id: number): Promise<Department> {
    const department = await this.departments.findOneBy({ id });
    if (!department) {
      throw new NotFoundException('Departamento não encontrado');
    }
    return department;
  }

  private async assertUnique(
    name: string,
    code: string,
    ignoreId?: number,
  ): Promise<void> {
    const sameName = await this.departments.findOneBy({ name });
    if (sameName && sameName.id !== ignoreId) {
      throw new ConflictException('Já existe um departamento com este nome');
    }
    const sameCode = await this.departments.findOneBy({ code });
    if (sameCode && sameCode.id !== ignoreId) {
      throw new ConflictException('Já existe um departamento com este código');
    }
  }

  private async withCounts(department: Department): Promise<DepartmentView> {
    const [courseCount, teacherCount] = await Promise.all([
      this.courses.countBy({ departmentId: department.id }),
      this.teachers.countBy({ departmentId: department.id }),
    ]);
    return { ...department, courseCount, teacherCount };
  }
}
