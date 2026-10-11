import { IsIn, IsOptional, IsString } from 'class-validator';
import {
  PROFILE_STATUSES,
  ProfileStatus,
  STAFF_ROLES,
  StaffRole,
} from '../../../common/domain/domain.constants';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SORT_ORDERS, SortOrder } from '../../../common/dto/sort';

export const STAFF_SORT_FIELDS = ['name', 'role', 'status'] as const;

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

  @IsOptional()
  @IsIn(STAFF_SORT_FIELDS)
  sort?: (typeof STAFF_SORT_FIELDS)[number];

  @IsOptional()
  @IsIn(SORT_ORDERS)
  order?: SortOrder;
}
