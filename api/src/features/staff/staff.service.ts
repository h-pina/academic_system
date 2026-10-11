import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Staff } from './entities/staff.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import { StaffRepository, StaffView } from './staff.repository';
import { TransactionService } from '../../common/database/transaction.service';
import { UserProvisioningService } from '../users/user-provisioning.service';
import { Paginated } from '../../common/dto/pagination-query.dto';

@Injectable()
export class StaffService {
  constructor(
    private readonly repository: StaffRepository,
    private readonly transactions: TransactionService,
    private readonly provisioning: UserProvisioningService,
  ) {}

  async list(query: ListStaffQueryDto): Promise<Paginated<StaffView>> {
    const { items, total } = await this.repository.findPage(query);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async get(userId: number): Promise<StaffView> {
    const staff = await this.repository.findView(userId);
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }
    return staff;
  }

  async create(dto: CreateStaffDto): Promise<StaffView> {
    const userId = await this.transactions.run(async (manager) => {
      const { user } = await this.provisioning.findOrCreate(manager, dto);

      const staff = manager.getRepository(Staff);
      if (await staff.existsBy({ userId: user.id })) {
        throw new ConflictException('This person is already a staff member');
      }

      await staff.insert({ userId: user.id, role: dto.role, status: 'active' });
      return user.id;
    });

    return this.get(userId);
  }

  /**
   * `actorUserId` is the administrator performing the change: nobody may
   * change their own role or status, and the last active admin is protected.
   */
  async update(
    userId: number,
    dto: UpdateStaffDto,
    actorUserId: number,
  ): Promise<StaffView> {
    await this.transactions.run(async (manager) => {
      const current = await this.requireStaff(manager, userId);

      const roleChanges = dto.role !== undefined && dto.role !== current.role;
      const statusChanges =
        dto.status !== undefined && dto.status !== current.status;
      if (userId === actorUserId && (roleChanges || statusChanges)) {
        throw new ConflictException(
          'You cannot change your own role or status',
        );
      }

      const loses =
        current.role === 'admin' &&
        current.status === 'active' &&
        ((dto.role !== undefined && dto.role !== 'admin') ||
          dto.status === 'inactive');
      if (loses) {
        await this.requireAnotherActiveAdmin(manager, userId);
      }

      const patch: Partial<Staff> = {};
      if (dto.role !== undefined) patch.role = dto.role;
      if (dto.status !== undefined) patch.status = dto.status;
      if (Object.keys(patch).length > 0) {
        await manager.getRepository(Staff).update({ userId }, patch);
      }
    });

    return this.get(userId);
  }

  /** Removes only the staff profile; the user stays. Prefer inactivating. */
  async remove(userId: number, actorUserId: number): Promise<void> {
    await this.transactions.run(async (manager) => {
      const current = await this.requireStaff(manager, userId);

      if (userId === actorUserId) {
        throw new ConflictException('You cannot remove your own staff profile');
      }
      if (current.role === 'admin' && current.status === 'active') {
        await this.requireAnotherActiveAdmin(manager, userId);
      }
      await manager.getRepository(Staff).delete({ userId });
    });
  }

  private async requireStaff(
    manager: EntityManager,
    userId: number,
  ): Promise<Staff> {
    const staff = await manager.getRepository(Staff).findOneBy({ userId });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }
    return staff;
  }

  private async requireAnotherActiveAdmin(
    manager: EntityManager,
    excludedUserId: number,
  ): Promise<void> {
    const others = await manager
      .getRepository(Staff)
      .createQueryBuilder('staff')
      .where("staff.role = 'admin'")
      .andWhere("staff.status = 'active'")
      .andWhere('staff.userId <> :excludedUserId', { excludedUserId })
      .getCount();

    if (others === 0) {
      throw new ConflictException(
        'There must always be at least one active administrator',
      );
    }
  }
}
