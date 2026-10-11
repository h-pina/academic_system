import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import {
  STUDENT_STATUSES,
  StudentStatus,
} from '../../../common/domain/domain.constants';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SORT_ORDERS, SortOrder } from '../../../common/dto/sort';

export const STUDENT_SORT_FIELDS = ['name', 'registrationNumber', 'course', 'entryYear', 'status'] as const;

export class ListStudentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  courseId?: number;

  @IsOptional()
  @IsIn(STUDENT_STATUSES)
  status?: StudentStatus;

  /** Matches name, matrícula or CPF. */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(STUDENT_SORT_FIELDS)
  sort?: (typeof STUDENT_SORT_FIELDS)[number];

  @IsOptional()
  @IsIn(SORT_ORDERS)
  order?: SortOrder;
}
