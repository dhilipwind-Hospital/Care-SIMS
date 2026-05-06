import {
  IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, Min, IsDateString, IsDecimal,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StockInDto {
  @IsUUID('4', { message: 'itemId must be a valid UUID' })
  itemId: string;

  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsDateString()
  manufactureDate?: string;

  @IsOptional()
  @IsString()
  manufacturerName?: string;

  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
