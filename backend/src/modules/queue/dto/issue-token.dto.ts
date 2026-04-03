import {
  IsNotEmpty, IsOptional, IsString, IsUUID,
} from 'class-validator';

export class IssueTokenDto {
  @IsUUID('4', { message: 'patientId must be a valid UUID' })
  patientId: string;

  @IsUUID('4', { message: 'locationId must be a valid UUID' })
  locationId: string;

  @IsOptional()
  @IsUUID('4')
  doctorId?: string;

  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

  @IsOptional()
  @IsUUID('4')
  appointmentId?: string;

  @IsOptional()
  @IsString()
  visitType?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
