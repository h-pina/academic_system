import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import {
  CLASS_STATUSES,
  ClassStatus,
  inList,
} from '../../../common/domain/domain.constants';
import { Semester } from '../../calendar/entities/semester.entity';
import { Subject } from '../../subjects/entities/subject.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';

/** A *turma*: one offering of a subject in a semester (REQ06). */
@Entity('class_groups')
@Unique('UQ_class_groups_code', ['semesterId', 'subjectId', 'code'])
@Check('CHK_class_groups_seats', `"seats" >= 1`)
@Check('CHK_class_groups_status', inList('status', CLASS_STATUSES))
export class ClassGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'semester_id', type: 'integer' })
  semesterId: number;

  @ManyToOne(() => Semester, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'semester_id' })
  semester: Semester;

  @Column({ name: 'subject_id', type: 'integer' })
  subjectId: number;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ name: 'teacher_id', type: 'integer', nullable: true })
  teacherId: number | null;

  @ManyToOne(() => Teacher, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher | null;

  @Column({ type: 'varchar', length: 20 })
  code: string;

  @Column({ type: 'integer' })
  seats: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ClassStatus;

  @Column({ name: 'requested_by', type: 'integer', nullable: true })
  requestedBy: number | null;

  @Column({ name: 'approved_by', type: 'integer', nullable: true })
  approvedBy: number | null;

  @Column({ name: 'approved_at', type: 'varchar', length: 30, nullable: true })
  approvedAt: string | null;

  @Column({ name: 'rejection_reason', type: 'varchar', length: 300, nullable: true })
  rejectionReason: string | null;
}
