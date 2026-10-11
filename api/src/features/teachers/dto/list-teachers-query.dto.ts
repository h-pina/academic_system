import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import {
  PROFILE_STATUSES,
  ProfileStatus,
} from '../../../common/domain/domain.constants';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SORT_ORDERS, SortOrder } from '../../../common/dto/sort';

export const TEACHER_SORT_FIELDS = ['name', 'department', 'title', 'status'] as const;

export class ListTeachersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsIn(PROFILE_STATUSES)
  status?: ProfileStatus;

  /** Matches name or CPF. */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(TEACHER_SORT_FIELDS)
  sort?: (typeof TEACHER_SORT_FIELDS)[number];

  @IsOptional()
  @IsIn(SORT_ORDERS)
  order?: SortOrder;
}
