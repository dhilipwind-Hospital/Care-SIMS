export type UserRole =
  | 'ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'RECEPTION'
  | 'PHARMACY'
  | 'LAB'
  | 'BILLING'
  | 'OT'
  | 'PLATFORM_OWNER'
  | 'PLATFORM_ADMIN'
  | 'PATIENT';

export type LoginType = 'TENANT' | 'DOCTOR' | 'PATIENT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId?: string;
  tenantName?: string;
  avatar?: string;
  phone?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface DoctorAffiliation {
  tenantId: string;
  tenantName: string;
  role: string;
  departmentName?: string;
}

export interface LoginResponse {
  accessToken: string;
  token?: string;
  refreshToken?: string;
  user?: any;
  doctor?: any;
  requiresOrgSelection?: boolean;
  affiliations?: DoctorAffiliation[];
  mfaRequired?: boolean;
  [key: string]: any;
}

export interface Patient {
  id: string;
  patientId: string;
  name: string;
  age: number;
  gender: string;
  phone?: string;
  email?: string;
  bloodGroup?: string;
}
