import {
  IsNotEmpty, IsOptional, IsString, IsUUID, IsDateString, IsNumber, Min,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID('4', { message: 'patientId must be a valid UUID' })
  patientId: string;

  @IsUUID('4', { message: 'doctorId must be a valid UUID' })
  doctorId: string;

  @IsDateString({}, { message: 'appointmentDate must be a valid date string' })
  appointmentDate: string;

  @IsOptional()
  @IsString()
  appointmentTime?: string;

  @IsOptional()
  @IsString()
  slotTime?: string;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  appointmentType?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
