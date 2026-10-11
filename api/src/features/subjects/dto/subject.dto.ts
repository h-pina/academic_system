import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SORT_ORDERS, SortOrder } from '../../../common/dto/sort';

export const SUBJECT_SORT_FIELDS = ['code', 'name', 'workloadHours'] as const;

const CODE_PATTERN = /^[A-Za-z0-9_-]{2,20}$/;
const CODE_MESSAGE = 'code must have 2-20 letters, digits, "-" or "_"';
export const MAX_WORKLOAD_HOURS = 1000;
export const MAX_PREREQUISITES = 20;

export class CreateSubjectDto {
  /** Short code such as `MAT101`; stored in upper case. */
  @IsString()
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  code: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name: string;

  @IsInt()
  @Min(1)
  @Max(MAX_WORKLOAD_HOURS)
  workloadHours: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_WORKLOAD_HOURS)
  workloadHours?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class ListSubjectsQueryDto extends PaginationQueryDto {
  /** Matches code or name. */
  @IsOptional()
  @IsString()
  q?: string;

  /** Only subjects that are part of this course's curriculum. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  courseId?: number;

  @IsOptional()
  @IsIn(SUBJECT_SORT_FIELDS)
  sort?: (typeof SUBJECT_SORT_FIELDS)[number];

  @IsOptional()
  @IsIn(SORT_ORDERS)
  order?: SortOrder;
}

export class SetPrerequisitesDto {
  @IsArray()
  @ArrayMaxSize(MAX_PREREQUISITES)
  @ArrayUnique()
  @IsInt({ each: true })
  prerequisiteIds: number[];
}
