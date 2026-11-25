import { Check, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Academic calendar: the period and the deadlines that govern enrollment,
 * withdrawal and grade posting (RN06, RN14). Dates are `YYYY-MM-DD`.
 */
@Entity('academic_calendars')
@Check('CHK_academic_calendars_period', `"start_date" < "end_date"`)
@Check(
  'CHK_academic_calendars_enrollment',
  `"enrollment_start" <= "enrollment_end"`,
)
export class AcademicCalendar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  description: string;

  @Column({ name: 'start_date', type: 'varchar', length: 10 })
  startDate: string;

  @Column({ name: 'end_date', type: 'varchar', length: 10 })
  endDate: string;

  @Column({ name: 'enrollment_start', type: 'varchar', length: 10 })
  enrollmentStart: string;

  @Column({ name: 'enrollment_end', type: 'varchar', length: 10 })
  enrollmentEnd: string;

  @Column({ name: 'withdrawal_deadline', type: 'varchar', length: 10 })
  withdrawalDeadline: string;

  @Column({ name: 'grades_deadline', type: 'varchar', length: 10 })
  gradesDeadline: string;
}
