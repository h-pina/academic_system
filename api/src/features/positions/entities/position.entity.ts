import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('positions')
export class Position {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;
}

export type PositionRecord = Position;
