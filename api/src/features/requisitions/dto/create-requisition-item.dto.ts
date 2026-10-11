import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateRequisitionItemDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  description: string;

  @IsInt()
  @Min(1)
  @Max(999_999)
  quantity: number;
}
