import {
  IsNotEmpty, IsOptional, IsString, IsUUID, IsArray, IsNumber, IsBoolean, Min, ValidateNested, ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PrescriptionItemDto {
  /**
   * Link to the catalog Drug. Optional because free-text prescribing is still
   * allowed, but without it the pharmacy cannot match the line to a batch (so
   * stock reads "Unknown") and billing falls back to the flat default price.
   * forbidNonWhitelisted is on, so this had to be declared before the doctor's
   * Rx form could send the id it already has in hand.
   */
  @IsOptional()
  @ValidateIf((_, v) => v !== '' && v !== null)
  @IsUUID('4')
  drugId?: string;

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
  prescriptionType?: string;

  @IsOptional()
  @IsString()
  rxType?: string;

  @IsOptional()
  @IsString()
  validityDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray({ message: 'items must be an array' })
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items: PrescriptionItemDto[];
}
