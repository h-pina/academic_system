import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateActivityDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  description: string;

  @IsISO8601({ strict: true })
  dueAt: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  allowLateUntil?: string;
}

export class UpdateActivityDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  dueAt?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  allowLateUntil?: string;
}

export class SubmitActivityDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  answerText?: string;
}
