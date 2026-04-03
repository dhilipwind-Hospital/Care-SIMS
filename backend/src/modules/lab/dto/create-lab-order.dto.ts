import {
  IsNotEmpty, IsOptional, IsString, IsUUID, IsArray, IsBoolean, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LabTestItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Test code is required' })
  testCode: string;

  @IsString()
  @IsNotEmpty({ message: 'Test name is required' })
  testName: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  urgency?: string;
}

export class CreateLabOrderDto {
  @IsUUID('4', { message: 'patientId must be a valid UUID' })
  patientId: string;

  @IsUUID('4', { message: 'doctorId must be a valid UUID' })
  doctorId: string;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @IsOptional()
  @IsUUID('4')
  consultationId?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsBoolean()
  fastingRequired?: boolean;

  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @IsArray({ message: 'tests must be an array' })
  @ValidateNested({ each: true })
  @Type(() => LabTestItemDto)
  tests: LabTestItemDto[];
}
