import { Type } from 'class-transformer';
import {
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
import {
  COURSE_STATUSES,
  CourseStatus,
} from '../../../common/domain/domain.constants';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const CODE_PATTERN = /^[A-Za-z0-9_-]{2,20}$/;
const CODE_MESSAGE = 'code must have 2-20 letters, digits, "-" or "_"';
export const MAX_SEMESTERS = 20;

export class CreateCourseDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name: string;

  /** Short code such as `CC`; stored in upper case. */
  @IsString()
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  code: string;

  @IsInt()
  departmentId: number;

  @IsInt()
  @Min(1)
  @Max(MAX_SEMESTERS)
  totalSemesters: number;

  @IsOptional()
  @IsIn(COURSE_STATUSES)
  status?: CourseStatus;
}

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  code?: string;

  @IsOptional()
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_SEMESTERS)
  totalSemesters?: number;

  @IsOptional()
  @IsIn(COURSE_STATUSES)
  status?: CourseStatus;
}

export class ListCoursesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsIn(COURSE_STATUSES)
  status?: CourseStatus;

  /** Matches name or code. */
  @IsOptional()
  @IsString()
  q?: string;
}
