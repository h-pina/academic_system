import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClassGroup } from '../../classes/entities/class-group.entity';

/** An evaluation of a class (exam, project...) that carries a weight. */
@Entity('assessments')
@Index('IDX_assessments_class', ['classId'])
@Check('CHK_assessments_weight', `"weight" > 0`)
@Check('CHK_assessments_max_score', `"max_score" > 0`)
export class Assessment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'class_id', type: 'integer' })
  classId: number;

  @ManyToOne(() => ClassGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  classGroup: ClassGroup;

  @Column({ type: 'varchar', length: 80 })
  name: string;

  @Column({ type: 'real' })
  weight: number;

  @Column({ name: 'max_score', type: 'real', default: 10 })
  maxScore: number;
}
