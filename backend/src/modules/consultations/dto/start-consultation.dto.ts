import {
  IsNotEmpty, IsOptional, IsString, IsUUID, IsBoolean,
} from 'class-validator';

export class StartConsultationDto {
  @IsUUID('4', { message: 'patientId must be a valid UUID' })
  patientId: string;

  @IsUUID('4', { message: 'doctorId must be a valid UUID' })
  doctorId: string;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @IsOptional()
  @IsUUID('4')
  queueTokenId?: string;

  @IsOptional()
  @IsUUID('4')
  appointmentId?: string;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @IsBoolean()
  isCrossLocation?: boolean;

  @IsOptional()
  @IsString()
  accessReason?: string;
}
