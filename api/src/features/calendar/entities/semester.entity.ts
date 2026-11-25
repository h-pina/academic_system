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
  SEMESTER_STATUSES,
  SemesterStatus,
  inList,
} from '../../../common/domain/domain.constants';
import { AcademicCalendar } from './academic-calendar.entity';

/** A school term (e.g. 2026/1), deployed under an academic calendar. */
@Entity('semesters')
@Unique('UQ_semesters_year_term', ['year', 'term'])
@Check('CHK_semesters_term', `"term" IN (1, 2)`)
@Check('CHK_semesters_status', inList('status', SEMESTER_STATUSES))
@Check('CHK_semesters_period', `"start_date" < "end_date"`)
export class Semester {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'calendar_id', type: 'integer' })
  calendarId: number;

  @ManyToOne(() => AcademicCalendar, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'calendar_id' })
  calendar: AcademicCalendar;

  @Column({ type: 'integer' })
  year: number;

  @Column({ type: 'integer' })
  term: number;

  @Column({ name: 'start_date', type: 'varchar', length: 10 })
  startDate: string;

  @Column({ name: 'end_date', type: 'varchar', length: 10 })
  endDate: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: SemesterStatus;
}
