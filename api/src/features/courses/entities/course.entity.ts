import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  COURSE_STATUSES,
  CourseStatus,
  inList,
} from '../../../common/domain/domain.constants';
import { Department } from '../../departments/entities/department.entity';

@Entity('courses')
@Check('CHK_courses_status', inList('status', COURSE_STATUSES))
@Check('CHK_courses_total_semesters', `"total_semesters" >= 1`)
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Column({ name: 'department_id', type: 'integer' })
  departmentId: number;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'total_semesters', type: 'integer' })
  totalSemesters: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: CourseStatus;
}
