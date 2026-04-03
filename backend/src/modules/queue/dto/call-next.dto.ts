import { IsOptional, IsUUID } from 'class-validator';

export class CallNextDto {
  @IsUUID('4', { message: 'doctorId must be a valid UUID' })
  doctorId: string;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;
}
