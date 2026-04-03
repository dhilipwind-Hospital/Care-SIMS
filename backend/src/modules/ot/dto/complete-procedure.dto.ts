import { IsOptional, IsString } from 'class-validator';

export class CompleteProcedureDto {
  @IsOptional()
  @IsString()
  intraOpNotes?: string;

  @IsOptional()
  @IsString()
  postOpNotes?: string;
}
