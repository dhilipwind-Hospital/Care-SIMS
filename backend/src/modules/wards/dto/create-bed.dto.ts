import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBedDto {
  @IsString()
  @IsNotEmpty({ message: 'Bed number is required' })
  bedNumber: string;

  @IsOptional()
  @IsString()
  type?: string;
}
