import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ClassGroup } from '../../classes/entities/class-group.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';

/** Presence of one enrollment on one lesson date (the *Frequência*). */
@Entity('attendance_records')
@Unique('UQ_attendance_enrollment_date', ['enrollmentId', 'lessonDate'])
@Index('IDX_attendance_class_date', ['classId', 'lessonDate'])
export class AttendanceRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'class_id', type: 'integer' })
  classId: number;

  @ManyToOne(() => ClassGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  classGroup: ClassGroup;

  @Column({ name: 'enrollment_id', type: 'integer' })
  enrollmentId: number;

  @ManyToOne(() => Enrollment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: Enrollment;

  @Column({ name: 'lesson_date', type: 'varchar', length: 10 })
  lessonDate: string;

  @Column({ type: 'boolean' })
  present: boolean;

  @Column({ name: 'recorded_by', type: 'integer' })
  recordedBy: number;
}
