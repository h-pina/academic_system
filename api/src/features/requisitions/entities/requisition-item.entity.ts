import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('material_requisition_items')
export class MaterialRequisitionItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'requisition_id', type: 'integer' })
  requisitionId: number;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'integer' })
  quantity: number;
}
