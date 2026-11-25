import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateAssessmentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(100)
  weight: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxScore?: number;
}

export class GradeEntryDto {
  @Type(() => Number)
  @IsInt()
  enrollmentId: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value: number;
}

export class PostGradesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => GradeEntryDto)
  entries: GradeEntryDto[];
}

export class RequestReopeningDto {
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  justification: string;

  /** Staff may open the window directly by informing the last day. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  openUntil?: string;
}

export class ApproveReopeningDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  openUntil: string;
}
