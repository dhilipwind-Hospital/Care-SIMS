import {
  IsNotEmpty, IsOptional, IsString, IsNumber, IsBoolean, Min,
} from 'class-validator';

export class CreateDrugDto {
  @IsString()
  @IsNotEmpty({ message: 'Brand name is required' })
  brandName: string;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  dosageForm?: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gstPct?: number;

  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStockLevel?: number;

  @IsOptional()
  @IsString()
  storageCondition?: string;

  @IsOptional()
  @IsBoolean()
  isControlled?: boolean;
}
