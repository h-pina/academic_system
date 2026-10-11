import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { IsOptional } from 'class-validator';

export const CODE_PATTERN = /^[A-Za-z0-9_-]{2,20}$/;

export class CreateDepartmentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name: string;

  /** Short code such as `DCC`; stored in upper case. */
  @IsString()
  @Matches(CODE_PATTERN, {
    message: 'code must have 2-20 letters, digits, "-" or "_"',
  })
  code: string;
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(CODE_PATTERN, {
    message: 'code must have 2-20 letters, digits, "-" or "_"',
  })
  code?: string;
}
