import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateTokenStatusDto {
  @IsString()
  @IsNotEmpty({ message: 'Status is required' })
  status: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
