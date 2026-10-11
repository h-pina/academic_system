import { IsIn, IsOptional, IsString } from 'class-validator';
import {
  PROFILE_STATUSES,
  ProfileStatus,
  STAFF_ROLES,
  StaffRole,
} from '../../../common/domain/domain.constants';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListStaffQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(STAFF_ROLES)
  role?: StaffRole;

  @IsOptional()
  @IsIn(PROFILE_STATUSES)
  status?: ProfileStatus;

  /** Matches name or CPF. */
  @IsOptional()
  @IsString()
  q?: string;
}
