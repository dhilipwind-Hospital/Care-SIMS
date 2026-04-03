import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { AdmitPatientDto } from './admit-patient.dto';

export class UpdateAdmissionDto extends PartialType(
  OmitType(AdmitPatientDto, ['patientId'] as const),
) {
  @IsOptional()
  @IsString()
  status?: string;
}
