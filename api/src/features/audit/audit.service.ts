import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { ClockService } from '../../common/clock/clock.service';
import { Paginated } from '../../common/dto/pagination-query.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>,
    private readonly clock: ClockService,
  ) {}

  /** Records one action. Pass `manager` to join the caller's transaction. */
  async log(
    actorId: number | null,
    action: string,
    entity: string,
    entityId: number | null,
    details?: Record<string, unknown>,
    manager?: EntityManager,
  ): Promise<void> {
    const repository = manager ? manager.getRepository(AuditLog) : this.logs;
    await repository.insert({
      actorId,
      action,
      entity,
      entityId,
      at: this.clock.now().toISOString(),
      details: details ? JSON.stringify(details) : null,
    });
  }

  async list(
    filter: { entity?: string; action?: string },
    page: number,
    pageSize: number,
  ): Promise<Paginated<AuditLog>> {
    const [items, total] = await this.logs.findAndCount({
      where: {
        ...(filter.entity ? { entity: filter.entity } : {}),
        ...(filter.action ? { action: filter.action } : {}),
      },
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items, total, page, pageSize };
  }
}
