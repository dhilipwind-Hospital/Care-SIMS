import {
  IsNotEmpty, IsOptional, IsString, IsUUID, IsArray, IsNumber, IsBoolean, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PrescriptionItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Drug name is required' })
  drugName: string;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsOptional()
  @IsString()
  dosageForm?: string;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsString()
  route?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  refillsAllowed?: number;

  @IsOptional()
  @IsBoolean()
  isControlled?: boolean;
}

export class CreatePrescriptionDto {
  @IsUUID('4', { message: 'patientId must be a valid UUID' })
  patientId: string;

  @IsUUID('4', { message: 'doctorId must be a valid UUID' })
  doctorId: string;

  @IsOptional()
  @IsUUID('4')
  consultationId?: string;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray({ message: 'items must be an array' })
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items: PrescriptionItemDto[];
}
