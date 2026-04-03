import {
  IsNotEmpty, IsOptional, IsString, IsUUID, IsDateString, IsNumber, IsArray, Min,
} from 'class-validator';

export class CreateOTBookingDto {
  @IsUUID('4', { message: 'patientId must be a valid UUID' })
  patientId: string;

  @IsUUID('4', { message: 'otRoomId must be a valid UUID' })
  otRoomId: string;

  @IsUUID('4', { message: 'primarySurgeonId must be a valid UUID' })
  primarySurgeonId: string;

  @IsString()
  @IsNotEmpty({ message: 'Procedure name is required' })
  procedureName: string;

  @IsDateString({}, { message: 'scheduledDate must be a valid date string' })
  scheduledDate: string;

  @IsString()
  @IsNotEmpty({ message: 'scheduledStart time is required' })
  scheduledStart: string;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @IsOptional()
  @IsUUID('4')
  admissionId?: string;

  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

  @IsOptional()
  @IsUUID('4')
  anesthetistId?: string;

  @IsOptional()
  @IsUUID('4')
  scrubNurseId?: string;

  @IsOptional()
  @IsArray()
  assistingSurgeons?: string[];

  @IsOptional()
  @IsString()
  procedureCode?: string;

  @IsOptional()
  @IsString()
  surgeryType?: string;

  @IsOptional()
  @IsString()
  anesthesiaType?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  expectedDurationMins?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bloodUnitsReserved?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
