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
  address?: any; // accepts string or object

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

  // Frontend-compatible fields (mapped to schema in service)
  @IsOptional()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Phone must be a valid phone number' })
  phone?: string;

  @IsOptional() @IsString() addressLine1?: string;
  @IsOptional() @IsString() addressLine2?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() pinCode?: string;

  @IsOptional() @IsString() knownAllergies?: string;
  @IsOptional() @IsString() preExistingConditions?: string;

  @IsOptional() @IsString() emergencyContactName?: string;
  @IsOptional() @IsString() emergencyContactPhone?: string;
  @IsOptional() @IsString() emergencyRelationship?: string;

  @IsOptional() @IsString() chiefComplaint?: string;

  // ── Visit details ──
  // Opt-in: when true, registration also issues a queue token so the patient
  // reaches the triage worklist and the selected doctor's queue. Off by
  // default so seeding/import callers keep their old behaviour.
  @IsOptional() @IsBoolean() addToQueue?: boolean;
  /** DoctorRegistry id — see the comment at the token create in patients.service. */
  @IsOptional() @IsString() preferredDoctorId?: string;
  @IsOptional() @IsString() departmentId?: string;
  /** Resolved to a real Department row by name when departmentId isn't known. */
  @IsOptional() @IsString() departmentName?: string;

  @IsOptional() @IsString() insuranceProvider?: string;
  @IsOptional() @IsString() policyNumber?: string;
  @IsOptional() @IsString() paymentMode?: string;
  @IsOptional() @IsString() visitType?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() preferredDoctor?: string;
  @IsOptional() @IsString() maritalStatus?: string;
  @IsOptional() @IsString() idType?: string;
  @IsOptional() @IsString() idNumber?: string;
  @IsOptional() @IsString() middleName?: string;
}
