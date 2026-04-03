import {
  IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, IsBoolean, Min,
} from 'class-validator';

export class CreateWardDto {
  @IsString()
  @IsNotEmpty({ message: 'Ward name is required' })
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalBeds?: number;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  phoneExtension?: string;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @IsOptional()
  @IsUUID('4')
  chargeNurseId?: string;

  @IsOptional()
  @IsBoolean()
  isIsolation?: boolean;
}
