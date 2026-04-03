import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateInventoryItemDto } from './create-item.dto';

export class UpdateInventoryItemDto extends PartialType(CreateInventoryItemDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
