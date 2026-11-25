import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { ENROLLMENT_STATUSES } from '../../../common/domain/domain.constants';

export class EnrollDto {
  @Type(() => Number)
  @IsInt()
  classId: number;
}

export class ListMyEnrollmentsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  semesterId?: number;

  @IsOptional()
  @IsIn(ENROLLMENT_STATUSES)
  status?: (typeof ENROLLMENT_STATUSES)[number];
}
