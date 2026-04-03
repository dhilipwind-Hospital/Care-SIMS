import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AdmitPatientDto {
  @IsUUID('4', { message: 'patientId must be a valid UUID' })
  patientId: string;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @IsOptional()
  @IsUUID('4')
  wardId?: string;

  @IsOptional()
  @IsUUID('4')
  bedId?: string;

  @IsOptional()
  @IsUUID('4')
  admittingDoctorId?: string;

  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

  @IsOptional()
  @IsString()
  admissionType?: string;

  @IsOptional()
  @IsString()
  diagnosisOnAdmission?: string;

  @IsOptional()
  @IsString()
  expectedDischargeDate?: string;
}
