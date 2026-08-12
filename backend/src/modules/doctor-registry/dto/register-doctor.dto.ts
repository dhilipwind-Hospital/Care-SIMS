import { IsEmail, IsNotEmpty, IsOptional, IsString, IsArray, IsDateString, MinLength } from 'class-validator';

/**
 * This route is @Public() and had no DTO at all — `@Body() body: any` — so a
 * request missing any required field produced a 500 rather than a useful 400.
 * Three specific ways it blew up: `new Date(dto.dateOfBirth)` and
 * `new Date(dto.registrationDate)` are called unconditionally and yield an
 * Invalid Date, and `phone` is NOT NULL with a unique index.
 *
 * Every field below is required in the database, so each one is validated here.
 */
export class RegisterDoctorDto {
  @IsEmail({}, { message: 'A valid email is required' })
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password?: string;

  @IsString() @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @IsString() @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  // NOT NULL and uniquely indexed — a missing phone used to surface as a 500.
  @IsString() @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;

  @IsString() @IsNotEmpty({ message: 'Gender is required' })
  gender: string;

  @IsDateString({}, { message: 'dateOfBirth must be a valid date (YYYY-MM-DD)' })
  dateOfBirth: string;

  @IsString() @IsNotEmpty({ message: 'Primary degree is required' })
  primaryDegree: string;

  @IsString() @IsNotEmpty({ message: 'Medical council is required' })
  medicalCouncil: string;

  @IsString() @IsNotEmpty({ message: 'Registration number is required' })
  registrationNo: string;

  @IsDateString({}, { message: 'registrationDate must be a valid date (YYYY-MM-DD)' })
  registrationDate: string;

  @IsOptional() @IsDateString({}, { message: 'registrationExpiry must be a valid date (YYYY-MM-DD)' })
  registrationExpiry?: string;

  @IsOptional() @IsArray() specialties?: string[];
  @IsOptional() @IsArray() subspecialties?: string[];
  @IsOptional() @IsArray() languages?: string[];
  @IsOptional() @IsString() bio?: string;
  @IsOptional() @IsString() pgDegree?: string;
  @IsOptional() @IsString() pgSpecialization?: string;
  @IsOptional() @IsString() university?: string;
}
