import {
  IsArray, IsNotEmpty, IsNumber, IsString, IsUUID, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DispensedItemDto {
  @IsUUID('4', { message: 'batchId must be a valid UUID' })
  batchId: string;

  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;
}

export class DispenseDto {
  @IsArray({ message: 'dispensedItems must be an array' })
  @ValidateNested({ each: true })
  @Type(() => DispensedItemDto)
  dispensedItems: DispensedItemDto[];
}
