import { IsNotEmpty, IsString } from 'class-validator';

export class MfaCodeDto {
  @IsString()
  @IsNotEmpty({ message: 'MFA code is required' })
  code: string;
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}
