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
import { Assessment } from './assessment.entity';
import { Enrollment } from '../../enrollments/entities/enrollment.entity';

/** The grade of one enrollment in one assessment (the *Nota* of the spec). */
@Entity('grades')
@Unique('UQ_grades_enrollment_assessment', ['enrollmentId', 'assessmentId'])
@Index('IDX_grades_enrollment', ['enrollmentId'])
@Check('CHK_grades_value', `"value" >= 0`)
export class Grade {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'enrollment_id', type: 'integer' })
  enrollmentId: number;

  @ManyToOne(() => Enrollment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: Enrollment;

  @Column({ name: 'assessment_id', type: 'integer' })
  assessmentId: number;

  @ManyToOne(() => Assessment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assessment_id' })
  assessment: Assessment;

  /** In the assessment's own scale (`0..max_score`, checked by the service). */
  @Column({ type: 'real' })
  value: number;

  @Column({ name: 'posted_by', type: 'integer' })
  postedBy: number;

  @Column({ name: 'posted_at', type: 'varchar', length: 30 })
  postedAt: string;
}
