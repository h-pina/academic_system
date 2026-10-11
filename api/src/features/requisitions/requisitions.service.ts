import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { RequisitionsRepository } from './requisitions.repository';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { UpdateRequisitionDto } from './dto/update-requisition.dto';
import {
  MAX_ITEMS_PER_REQUISITION,
  MIN_ITEMS_PER_REQUISITION,
  MaterialRequisition,
} from './entities/requisition.entity';
import { MaterialRequisitionItem } from './entities/requisition-item.entity';

export interface RequisitionListItem {
  id: number;
  createdAt: string;
  status: string;
  priorityRequested: boolean;
  itemCount: number;
}

export type RequisitionWithItems = MaterialRequisition & {
  items: MaterialRequisitionItem[];
};

const MSG_TOO_MANY_ITEMS =
  'Item limit exceeded. A material requisition can have at most 10 items.';
const MSG_NO_ITEMS = 'A material requisition must have at least one item.';
const MSG_MISSING_JUSTIFICATION =
  'A prioritization request requires a justification.';

@Injectable()
export class RequisitionsService {
  constructor(
    private readonly requisitionsRepository: RequisitionsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async create(
    cpf: string,
    dto: CreateRequisitionDto,
  ): Promise<{ id: number }> {
    const requester = await this.usersRepository.findByCpf(cpf);
    if (!requester) {
      throw new NotFoundException('Requester not found');
    }

    this.assertItemCount(dto.items?.length ?? 0);
    const priorityJustification = this.resolvePriority(dto);

    const requisition = await this.requisitionsRepository.create({
      requesterCpf: requester.cpf,
      requesterName: requester.name,
      createdAt: today(),
      status: 'AWAITING_APPROVAL',
      priorityRequested: Boolean(dto.priorityRequested),
      priorityJustification,
      items: dto.items.map((item) => ({
        description: item.description.trim(),
        quantity: item.quantity,
      })),
    });

    return { id: requisition.id };
  }

  async findMine(cpf: string): Promise<RequisitionListItem[]> {
    const requisitions =
      await this.requisitionsRepository.findByRequester(cpf);
    const counts = await this.requisitionsRepository.countItemsByRequisition(
      requisitions.map((r) => r.id),
    );

    return requisitions.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      status: r.status,
      priorityRequested: r.priorityRequested,
      itemCount: counts.get(r.id) ?? 0,
    }));
  }

  async findOne(cpf: string, id: number): Promise<RequisitionWithItems> {
    const requisition = await this.getOwned(cpf, id);
    const items = await this.requisitionsRepository.findItems(id);
    return { ...requisition, items };
  }

  async resubmit(
    cpf: string,
    id: number,
    dto: UpdateRequisitionDto,
  ): Promise<void> {
    const requisition = await this.getOwned(cpf, id);
    if (requisition.status !== 'AWAITING_CHANGES') {
      throw new BadRequestException(
        'Only a requisition awaiting changes can be edited and resubmitted.',
      );
    }

    this.assertItemCount(dto.items?.length ?? 0);
    const priorityJustification = this.resolvePriority(dto);

    await this.requisitionsRepository.replaceItemsAndResubmit(id, {
      status: 'AWAITING_APPROVAL',
      priorityRequested: Boolean(dto.priorityRequested),
      priorityJustification,
      items: dto.items.map((item) => ({
        description: item.description.trim(),
        quantity: item.quantity,
      })),
    });
  }

  private assertItemCount(count: number): void {
    if (count < MIN_ITEMS_PER_REQUISITION) {
      throw new BadRequestException(MSG_NO_ITEMS);
    }
    if (count > MAX_ITEMS_PER_REQUISITION) {
      throw new BadRequestException(MSG_TOO_MANY_ITEMS);
    }
  }

  private resolvePriority(dto: CreateRequisitionDto): string | null {
    if (!dto.priorityRequested) {
      return null;
    }
    const justification = dto.priorityJustification?.trim();
    if (!justification) {
      throw new BadRequestException(MSG_MISSING_JUSTIFICATION);
    }
    return justification;
  }

  private async getOwned(
    cpf: string,
    id: number,
  ): Promise<MaterialRequisition> {
    const requisition = await this.requisitionsRepository.findById(id);
    if (!requisition || requisition.requesterCpf !== cpf) {
      throw new NotFoundException('Material requisition not found');
    }
    return requisition;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
