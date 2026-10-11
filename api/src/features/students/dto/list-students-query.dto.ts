import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import {
  STUDENT_STATUSES,
  StudentStatus,
} from '../../../common/domain/domain.constants';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

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
}
