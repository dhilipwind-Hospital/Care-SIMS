import {
  IsNotEmpty, IsOptional, IsString, IsEmail, IsUUID, IsArray, MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'roleId must be a valid UUID' })
  roleId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'primaryLocationId must be a valid UUID' })
  primaryLocationId?: string;

  @IsOptional()
  @IsString()
  locationScope?: string;

  @IsOptional()
  @IsArray()
  allowedLocations?: string[];
}
