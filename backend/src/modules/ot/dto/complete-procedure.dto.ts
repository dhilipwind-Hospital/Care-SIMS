import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CompleteProcedureDto {
  @IsOptional()
  @IsString()
  intraOpNotes?: string;

  @IsOptional()
  @IsString()
  postOpNotes?: string;

  // Intra-op outcomes (Phase 2)
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedBloodLoss?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bloodUnitsUsed?: number;

  @IsOptional()
  @IsString()
  complications?: string;

  @IsOptional()
  @IsBoolean()
  drainInserted?: boolean;

  @IsOptional()
  @IsString()
  drainType?: string;

  // Specimen + implant tracking (Phase 2). Backend stores both as Json?
  // columns; accepting them as either string[] or object[] keeps the door
  // open for richer structured payloads later.
  @IsOptional()
  @IsArray()
  specimens?: any[];

  @IsOptional()
  @IsArray()
  implants?: any[];
}
