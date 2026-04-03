import {
  IsOptional, IsString, IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ConsultationDiagnosisDto {
  @IsString()
  icdCode: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  type?: string;
}

export class UpdateConsultationDto {
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @IsString()
  assessment?: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  historySubjective?: string;

  @IsOptional()
  @IsString()
  historyObjective?: string;

  @IsOptional()
  @IsString()
  examinationFindings?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsultationDiagnosisDto)
  diagnoses?: ConsultationDiagnosisDto[];
}
