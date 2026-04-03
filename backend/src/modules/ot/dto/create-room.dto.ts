import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOTRoomDto {
  @IsString()
  @IsNotEmpty({ message: 'Room name is required' })
  name: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  capacityClass?: string;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;
}
