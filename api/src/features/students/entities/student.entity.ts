import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import {
  STUDENT_STATUSES,
  StudentStatus,
  inList,
} from '../../../common/domain/domain.constants';
import { Course } from '../../courses/entities/course.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Student profile; being a student means having a row here. The student's
 * matrícula is `users.registration_number`.
 */
@Entity('students')
@Check('CHK_students_status', inList('status', STUDENT_STATUSES))
@Check('CHK_students_entry_year', `"entry_year" BETWEEN 1900 AND 2100`)
export class Student {
  @PrimaryColumn({ name: 'user_id', type: 'integer' })
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'course_id', type: 'integer' })
  courseId: number;

  @ManyToOne(() => Course, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'entry_year', type: 'integer' })
  entryYear: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: StudentStatus;
}
