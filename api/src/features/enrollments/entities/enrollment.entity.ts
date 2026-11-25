import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import {
  ENROLLMENT_STATUSES,
  EnrollmentStatus,
  inList,
} from '../../../common/domain/domain.constants';
import { ClassGroup } from '../../classes/entities/class-group.entity';
import { Student } from '../../students/entities/student.entity';

/** A student's enrollment (*inscrição*) in a class. */
@Entity('enrollments')
@Unique('UQ_enrollments_student_class', ['studentId', 'classId'])
@Index('IDX_enrollments_student', ['studentId'])
@Index('IDX_enrollments_class', ['classId'])
@Check('CHK_enrollments_status', inList('status', ENROLLMENT_STATUSES))
export class Enrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id', type: 'integer' })
  studentId: number;

  @ManyToOne(() => Student, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'class_id', type: 'integer' })
  classId: number;

  @ManyToOne(() => ClassGroup, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'class_id' })
  classGroup: ClassGroup;

  @Column({ type: 'varchar', length: 20, default: 'confirmed' })
  status: EnrollmentStatus;

  @Column({ name: 'requested_at', type: 'varchar', length: 30 })
  requestedAt: string;

  @Column({ name: 'confirmed_at', type: 'varchar', length: 30, nullable: true })
  confirmedAt: string | null;

  /** Weighted average on the 0-10 scale, stored when the class is finalized. */
  @Column({ name: 'final_grade', type: 'real', nullable: true })
  finalGrade: number | null;
}
