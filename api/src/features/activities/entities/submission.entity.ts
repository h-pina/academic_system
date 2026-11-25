import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Activity } from './activity.entity';
import { Student } from '../../students/entities/student.entity';

/** A student's delivery; sending again replaces it (UC12 A01). */
@Entity('submissions')
@Unique('UQ_submissions_activity_student', ['activityId', 'studentId'])
@Index('IDX_submissions_student', ['studentId'])
export class Submission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'activity_id', type: 'integer' })
  activityId: number;

  @ManyToOne(() => Activity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  @Column({ name: 'student_id', type: 'integer' })
  studentId: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'answer_text', type: 'varchar', length: 5000, nullable: true })
  answerText: string | null;

  @Column({ name: 'file_name', type: 'varchar', length: 160, nullable: true })
  fileName: string | null;

  /** Path of the stored file, relative to the upload directory. */
  @Column({ name: 'file_path', type: 'varchar', length: 240, nullable: true })
  filePath: string | null;

  @Column({ name: 'submitted_at', type: 'varchar', length: 30 })
  submittedAt: string;

  @Column({ type: 'boolean', default: false })
  late: boolean;
}
