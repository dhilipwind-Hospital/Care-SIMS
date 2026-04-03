import {
  IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, Min,
} from 'class-validator';

export class StockInDto {
  @IsUUID('4', { message: 'itemId must be a valid UUID' })
  itemId: string;

  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;

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
