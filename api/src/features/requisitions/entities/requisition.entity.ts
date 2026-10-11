import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export const MIN_ITEMS_PER_REQUISITION = 1;
export const MAX_ITEMS_PER_REQUISITION = 10;

export const REQUISITION_STATUSES = [
  'AWAITING_APPROVAL',
  'AWAITING_CHANGES',
  'APPROVED',
  'CANCELLED',
] as const;

export type RequisitionStatus = (typeof REQUISITION_STATUSES)[number];

@Entity('material_requisitions')
export class MaterialRequisition {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'requester_cpf', type: 'varchar', length: 11 })
  requesterCpf: string;

  @Column({ name: 'requester_name', type: 'varchar', length: 120 })
  requesterName: string;

  @Column({ name: 'created_at', type: 'date' })
  createdAt: string;

  @Column({ type: 'varchar', length: 32, default: 'AWAITING_APPROVAL' })
  status: RequisitionStatus;

  @Column({ name: 'priority_requested', type: 'boolean', default: false })
  priorityRequested: boolean;

  @Column({ name: 'priority_justification', type: 'text', nullable: true })
  priorityJustification: string | null;

  @Column({ name: 'reviewer_note', type: 'text', nullable: true })
  reviewerNote: string | null;
}
