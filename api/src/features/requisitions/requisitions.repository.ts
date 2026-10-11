import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MaterialRequisition,
  RequisitionStatus,
} from './entities/requisition.entity';
import { MaterialRequisitionItem } from './entities/requisition-item.entity';

interface ItemInput {
  description: string;
  quantity: number;
}

@Injectable()
export class RequisitionsRepository {
  constructor(
    @InjectRepository(MaterialRequisition)
    private readonly requisitions: Repository<MaterialRequisition>,
    @InjectRepository(MaterialRequisitionItem)
    private readonly items: Repository<MaterialRequisitionItem>,
  ) {}

  findByRequester(cpf: string): Promise<MaterialRequisition[]> {
    return this.requisitions.find({
      where: { requesterCpf: cpf },
      order: { id: 'DESC' },
    });
  }

  findById(id: number): Promise<MaterialRequisition | null> {
    return this.requisitions.findOne({ where: { id } });
  }

  findItems(requisitionId: number): Promise<MaterialRequisitionItem[]> {
    return this.items.find({
      where: { requisitionId },
      order: { id: 'ASC' },
    });
  }

  async countItemsByRequisition(ids: number[]): Promise<Map<number, number>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.items
      .createQueryBuilder('item')
      .select('item.requisitionId', 'requisitionId')
      .addSelect('COUNT(*)', 'count')
      .where('item.requisitionId IN (:...ids)', { ids })
      .groupBy('item.requisitionId')
      .getRawMany<{ requisitionId: number; count: string }>();

    return new Map(rows.map((r) => [Number(r.requisitionId), Number(r.count)]));
  }

  async create(data: {
    requesterCpf: string;
    requesterName: string;
    createdAt: string;
    status: RequisitionStatus;
    priorityRequested: boolean;
    priorityJustification: string | null;
    items: ItemInput[];
  }): Promise<MaterialRequisition> {
    return this.requisitions.manager.transaction(async (em) => {
      const requisition = await em.save(
        em.create(MaterialRequisition, {
          requesterCpf: data.requesterCpf,
          requesterName: data.requesterName,
          createdAt: data.createdAt,
          status: data.status,
          priorityRequested: data.priorityRequested,
          priorityJustification: data.priorityJustification,
          reviewerNote: null,
        }),
      );
      await em.save(
        data.items.map((item) =>
          em.create(MaterialRequisitionItem, {
            requisitionId: requisition.id,
            description: item.description,
            quantity: item.quantity,
          }),
        ),
      );
      return requisition;
    });
  }

  async replaceItemsAndResubmit(
    id: number,
    data: {
      status: RequisitionStatus;
      priorityRequested: boolean;
      priorityJustification: string | null;
      items: ItemInput[];
    },
  ): Promise<void> {
    await this.requisitions.manager.transaction(async (em) => {
      await em.delete(MaterialRequisitionItem, { requisitionId: id });
      await em.save(
        data.items.map((item) =>
          em.create(MaterialRequisitionItem, {
            requisitionId: id,
            description: item.description,
            quantity: item.quantity,
          }),
        ),
      );
      await em.update(
        MaterialRequisition,
        { id },
        {
          status: data.status,
          priorityRequested: data.priorityRequested,
          priorityJustification: data.priorityJustification,
        },
      );
    });
  }
}
