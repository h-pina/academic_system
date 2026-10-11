import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import {
  PROFILE_STATUSES,
  ProfileStatus,
} from '../../../common/domain/domain.constants';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

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
}
