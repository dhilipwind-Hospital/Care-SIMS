import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateLabOrderStatusDto {
  @IsString()
  @IsNotEmpty({ message: 'Status is required' })
  status: string;
}
