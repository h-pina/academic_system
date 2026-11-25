import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClassGroup } from '../../classes/entities/class-group.entity';

/** Work published by a teacher with a delivery deadline (REQ13). */
@Entity('activities')
@Index('IDX_activities_class', ['classId'])
export class Activity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'class_id', type: 'integer' })
  classId: number;

  @ManyToOne(() => ClassGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  classGroup: ClassGroup;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'varchar', length: 2000 })
  description: string;

  /** ISO date-time of the deadline. */
  @Column({ name: 'due_at', type: 'varchar', length: 30 })
  dueAt: string;

  /** When set, late submissions are accepted until this ISO date-time (RN10). */
  @Column({ name: 'allow_late_until', type: 'varchar', length: 30, nullable: true })
  allowLateUntil: string | null;

  @Column({ name: 'created_by', type: 'integer' })
  createdBy: number;

  @Column({ name: 'created_at', type: 'varchar', length: 30 })
  createdAt: string;
}
