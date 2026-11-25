import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClassGroup } from './class-group.entity';

/** One weekly meeting of a class. Times are `HH:MM`. */
@Entity('class_schedules')
@Index('IDX_class_schedules_class', ['classId'])
@Check('CHK_class_schedules_weekday', `"weekday" BETWEEN 1 AND 7`)
@Check('CHK_class_schedules_time', `"start_time" < "end_time"`)
export class ClassSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'class_id', type: 'integer' })
  classId: number;

  @ManyToOne(() => ClassGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  classGroup: ClassGroup;

  /** ISO weekday: 1 = Monday ... 7 = Sunday. */
  @Column({ type: 'integer' })
  weekday: number;

  @Column({ name: 'start_time', type: 'varchar', length: 5 })
  startTime: string;

  @Column({ name: 'end_time', type: 'varchar', length: 5 })
  endTime: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  room: string | null;
}
