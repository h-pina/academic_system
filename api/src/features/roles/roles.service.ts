import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RoleName } from '../../common/domain/roles';
import { Staff } from '../staff/entities/staff.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Student } from '../students/entities/student.entity';

/**
 * Derives a user's roles from the profile tables. A profile grants its role
 * only while it is in good standing:
 * - staff and teachers: `status = 'active'`;
 * - students: any status except `dropped`.
 */
@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Staff) private readonly staff: Repository<Staff>,
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(Student) private readonly students: Repository<Student>,
  ) {}

  async resolveRoles(userId: number): Promise<RoleName[]> {
    return (await this.resolveRolesFor([userId])).get(userId) ?? [];
  }

  async resolveRolesFor(userIds: number[]): Promise<Map<number, RoleName[]>> {
    const result = new Map<number, RoleName[]>(userIds.map((id) => [id, []]));
    if (userIds.length === 0) {
      return result;
    }

    const [staff, teachers, students] = await Promise.all([
      this.staff.find({ where: { userId: In(userIds), status: 'active' } }),
      this.teachers.find({ where: { userId: In(userIds), status: 'active' } }),
      this.students.find({ where: { userId: In(userIds) } }),
    ]);

    for (const row of staff) {
      result.get(row.userId)?.push(row.role);
    }
    for (const row of teachers) {
      result.get(row.userId)?.push('teacher');
    }
    for (const row of students) {
      if (row.status !== 'dropped') {
        result.get(row.userId)?.push('student');
      }
    }
    return result;
  }
}
