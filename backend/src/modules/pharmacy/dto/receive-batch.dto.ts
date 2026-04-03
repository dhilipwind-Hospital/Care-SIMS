import {
  IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, IsDateString, Min,
} from 'class-validator';

export class ReceiveBatchDto {
  @IsUUID('4', { message: 'drugId must be a valid UUID' })
  drugId: string;

  @IsUUID('4', { message: 'locationId must be a valid UUID' })
  locationId: string;

  @IsString()
  @IsNotEmpty({ message: 'Batch number is required' })
  batchNumber: string;

  @IsDateString({}, { message: 'expiryDate must be a valid date string' })
  expiryDate: string;

  @IsNumber()
  @Min(0, { message: 'Unit cost cannot be negative' })
  unitCost: number;

  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;

  @IsOptional()
  @IsString()
  shelfLocation?: string;
}
