import { IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class RecordPaymentDto {
  @IsNumber()
  @Min(0.01, { message: 'Payment amount must be greater than 0' })
  amount: number;

  @IsString()
  @IsNotEmpty({ message: 'Payment method is required' })
  paymentMethod: string;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
