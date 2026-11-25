import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  REOPENING_STATUSES,
  ReopeningStatus,
  inList,
} from '../../../common/domain/domain.constants';
import { ClassGroup } from '../../classes/entities/class-group.entity';

/** Justified request to post grades after the calendar deadline (RN14). */
@Entity('grade_reopenings')
@Check('CHK_grade_reopenings_status', inList('status', REOPENING_STATUSES))
export class GradeReopening {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'class_id', type: 'integer' })
  classId: number;

  @ManyToOne(() => ClassGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  classGroup: ClassGroup;

  @Column({ type: 'varchar', length: 500 })
  justification: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ReopeningStatus;

  @Column({ name: 'requested_by', type: 'integer' })
  requestedBy: number;

  @Column({ name: 'decided_by', type: 'integer', nullable: true })
  decidedBy: number | null;

  /** Last day (inclusive, `YYYY-MM-DD`) on which grades may be posted. */
  @Column({ name: 'open_until', type: 'varchar', length: 10, nullable: true })
  openUntil: string | null;
}
