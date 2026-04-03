import {
  IsNotEmpty, IsOptional, IsString, IsUUID, IsArray, IsNumber, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LabResultItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Test name is required' })
  testName: string;

  @IsString()
  @IsNotEmpty({ message: 'Result value is required' })
  resultValue: string;

  @IsOptional()
  @IsString()
  resultUnit?: string;

  @IsOptional()
  @IsNumber()
  refRangeLow?: number;

  @IsOptional()
  @IsNumber()
  refRangeHigh?: number;

  @IsOptional()
  @IsString()
  refRangeText?: string;

  @IsOptional()
  @IsString()
  flag?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  analyzer?: string;
}

export class EnterResultDto {
  @IsOptional()
  @IsUUID('4')
  locationId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray({ message: 'items must be an array' })
  @ValidateNested({ each: true })
  @Type(() => LabResultItemDto)
  items: LabResultItemDto[];
}
