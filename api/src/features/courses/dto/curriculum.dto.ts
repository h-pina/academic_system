import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class AddCurriculumItemDto {
  @IsInt()
  subjectId: number;

  @IsInt()
  @Min(1)
  semester: number;

  /** Defaults to mandatory. */
  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;
}

export class UpdateCurriculumItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  semester?: number;

  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;
}
