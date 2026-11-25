import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
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
  ValidateNested,
} from 'class-validator';
import { CLASS_STATUSES } from '../../../common/domain/domain.constants';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class ScheduleDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  weekday: number;

  @Matches(TIME)
  startTime: string;

  @Matches(TIME)
  endTime: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  room?: string;
}

export class CreateClassDto {
  @Type(() => Number)
  @IsInt()
  semesterId: number;

  @Type(() => Number)
  @IsInt()
  subjectId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  seats: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teacherId?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ScheduleDto)
  schedules?: ScheduleDto[];
}

/** A teacher's request to open a class (UC09). */
export class RequestClassDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  semesterId?: number;

  @Type(() => Number)
  @IsInt()
  subjectId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  seats: number;

  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ScheduleDto)
  schedules: ScheduleDto[];
}

export class UpdateClassDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  seats?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teacherId?: number;
}

export class SetSchedulesDto {
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ScheduleDto)
  schedules: ScheduleDto[];
}

export class RejectClassDto {
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason: string;
}

export class ListClassesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  semesterId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subjectId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  teacherId?: number;

  @IsOptional()
  @IsIn(CLASS_STATUSES)
  status?: (typeof CLASS_STATUSES)[number];

  @IsOptional()
  @IsString()
  q?: string;
}
