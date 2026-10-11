import { IsString, MinLength } from 'class-validator';

export class UpdatePositionDto {
  @IsString()
  @MinLength(2)
  name: string;
}
