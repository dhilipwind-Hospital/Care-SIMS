import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateDrugDto } from './create-drug.dto';

export class UpdateDrugDto extends PartialType(CreateDrugDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
