import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DischargeDto {
  @IsOptional()
  @IsString()
  dischargeType?: string;

  @IsOptional()
  @IsString()
  dischargeDiagnosis?: string;

  @IsOptional()
  @IsString()
  dischargeSummary?: string;
}
