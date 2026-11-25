import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Append-only record of critical actions (spec benefit 7, LGPD traceability). */
@Entity('audit_log')
@Index('IDX_audit_log_entity', ['entity', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'actor_id', type: 'integer', nullable: true })
  actorId: number | null;

  @Column({ type: 'varchar', length: 60 })
  action: string;

  @Column({ type: 'varchar', length: 60 })
  entity: string;

  @Column({ name: 'entity_id', type: 'integer', nullable: true })
  entityId: number | null;

  @Column({ type: 'varchar', length: 30 })
  at: string;

  @Column({ type: 'text', nullable: true })
  details: string | null;
}
