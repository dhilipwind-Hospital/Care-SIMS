import {
  IsNotEmpty, IsOptional, IsString, IsEmail, IsNumber, IsArray, IsBoolean, Matches,
} from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Mobile must be a valid phone number' })
  mobile?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsNumber()
  ageYears?: number;

  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  emergencyContact?: any;

  @IsOptional()
  @IsArray()
  allergies?: string[];

  @IsOptional()
  @IsString()
  allergyDetails?: string;

  @IsOptional()
  @IsArray()
  existingConditions?: string[];

  @IsOptional()
  @IsString()
  currentMedications?: string;

  @IsOptional()
  @IsString()
  pastSurgeries?: string;

  @IsOptional()
  @IsString()
  familyHistory?: string;

  @IsOptional()
  insurance?: any;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  registrationType?: string;
}
