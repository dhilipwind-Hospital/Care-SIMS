import { IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class AddLineItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  description: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity: number;

  @IsNumber()
  @Min(0, { message: 'Unit price cannot be negative' })
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxPct?: number;

  @IsOptional()
  @IsString()
  referenceId?: string;
}
