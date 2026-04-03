import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class SelectOrgDto {
  @IsString()
  @IsNotEmpty()
  affiliationId: string;
}

export class SelectOrgForPatientDto {
  @IsUUID('4', { message: 'tenantId must be a valid UUID' })
  tenantId: string;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;
}
