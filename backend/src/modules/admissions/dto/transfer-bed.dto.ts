import { IsNotEmpty, IsUUID } from 'class-validator';

export class TransferBedDto {
  @IsUUID('4', { message: 'newBedId must be a valid UUID' })
  @IsNotEmpty()
  newBedId: string;
}
