import { Check, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('subjects')
@Check('CHK_subjects_workload_hours', `"workload_hours" >= 1`)
export class Subject {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'workload_hours', type: 'integer' })
  workloadHours: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;
}
