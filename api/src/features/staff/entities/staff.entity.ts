import { Check, Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import {
  PROFILE_STATUSES,
  ProfileStatus,
  STAFF_ROLES,
  StaffRole,
  inList,
} from '../../../common/domain/domain.constants';
import { User } from '../../users/entities/user.entity';

/** Administrative profile. One administrative role per person. */
@Entity('staff')
@Check('CHK_staff_role', inList('role', STAFF_ROLES))
@Check('CHK_staff_status', inList('status', PROFILE_STATUSES))
export class Staff {
  @PrimaryColumn({ name: 'user_id', type: 'integer' })
  userId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 20 })
  role: StaffRole;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: ProfileStatus;
}
