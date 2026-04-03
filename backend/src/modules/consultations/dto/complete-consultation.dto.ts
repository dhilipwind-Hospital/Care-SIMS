import {
  IsOptional, IsString, IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConsultationDiagnosisDto } from './update-consultation.dto';

export class CompleteConsultationDto {
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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsultationDiagnosisDto)
  diagnoses?: ConsultationDiagnosisDto[];
}
