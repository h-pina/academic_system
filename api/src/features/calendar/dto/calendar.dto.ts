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
import { SEMESTER_STATUSES } from '../../../common/domain/domain.constants';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateCalendarDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  description: string;

  @Matches(DATE)
  startDate: string;

  @Matches(DATE)
  endDate: string;

  @Matches(DATE)
  enrollmentStart: string;

  @Matches(DATE)
  enrollmentEnd: string;

  @Matches(DATE)
  withdrawalDeadline: string;

  @Matches(DATE)
  gradesDeadline: string;
}

export class UpdateCalendarDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  description?: string;

  @IsOptional()
  @Matches(DATE)
  startDate?: string;

  @IsOptional()
  @Matches(DATE)
  endDate?: string;

  @IsOptional()
  @Matches(DATE)
  enrollmentStart?: string;

  @IsOptional()
  @Matches(DATE)
  enrollmentEnd?: string;

  @IsOptional()
  @Matches(DATE)
  withdrawalDeadline?: string;

  @IsOptional()
  @Matches(DATE)
  gradesDeadline?: string;
}

export class CreateSemesterDto {
  @Type(() => Number)
  @IsInt()
  calendarId: number;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2)
  term: number;

  @Matches(DATE)
  startDate: string;

  @Matches(DATE)
  endDate: string;
}

export class ListSemestersQueryDto {
  @IsOptional()
  @IsIn(SEMESTER_STATUSES)
  status?: (typeof SEMESTER_STATUSES)[number];
}
