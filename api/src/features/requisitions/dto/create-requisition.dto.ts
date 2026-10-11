import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateRequisitionItemDto } from './create-requisition-item.dto';
import {
  MAX_ITEMS_PER_REQUISITION,
  MIN_ITEMS_PER_REQUISITION,
} from '../entities/requisition.entity';

export class CreateRequisitionDto {
  @IsArray()
  @ArrayMinSize(MIN_ITEMS_PER_REQUISITION, {
    message: 'A material requisition must have at least one item.',
  })
  @ArrayMaxSize(MAX_ITEMS_PER_REQUISITION, {
    message:
      'Item limit exceeded. A material requisition can have at most 10 items.',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateRequisitionItemDto)
  items: CreateRequisitionItemDto[];

  @IsOptional()
  @IsBoolean()
  priorityRequested?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  priorityJustification?: string;
}
