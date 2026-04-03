import {
  IsNotEmpty, IsOptional, IsString, IsUUID, IsArray, IsNumber, IsEnum, ValidateNested, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceLineItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Line item description is required' })
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

export class CreateInvoiceDto {
  @IsUUID('4', { message: 'patientId must be a valid UUID' })
  patientId: string;

  @IsOptional()
  @IsString()
  invoiceType?: string;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @IsOptional()
  @IsUUID('4')
  admissionId?: string;

  @IsOptional()
  @IsUUID('4')
  doctorId?: string;

  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @IsOptional()
  @IsString()
  insuranceProvider?: string;

  @IsOptional()
  @IsString()
  policyNumber?: string;

  @IsArray({ message: 'lineItems must be an array' })
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  lineItems: InvoiceLineItemDto[];
}
