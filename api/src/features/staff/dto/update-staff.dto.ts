import { IsIn, IsOptional } from 'class-validator';
import {
  PROFILE_STATUSES,
  ProfileStatus,
  STAFF_ROLES,
  StaffRole,
} from '../../../common/domain/domain.constants';

export class UpdateStaffDto {
  @IsOptional()
  @IsIn(STAFF_ROLES)
  role?: StaffRole;

  @IsOptional()
  @IsIn(PROFILE_STATUSES)
  status?: ProfileStatus;
}
