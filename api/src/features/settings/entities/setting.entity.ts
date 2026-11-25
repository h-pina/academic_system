import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Institution-wide parameters (key/value), e.g. the minimum passing grade. */
@Entity('institution_settings')
export class Setting {
  @PrimaryColumn({ type: 'varchar', length: 60 })
  key: string;

  @Column({ type: 'varchar', length: 200 })
  value: string;
}
