import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateOTBookingDto } from './create-booking.dto';

export class UpdateOTBookingDto extends PartialType(CreateOTBookingDto) {
  @IsOptional()
  @IsString()
  status?: string;
}
