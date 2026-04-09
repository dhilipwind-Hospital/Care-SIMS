export interface AuthUser {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;          // UI role key: ADMIN, DOCTOR, NURSE, PHARMACY, etc.
  systemRoleId: string;  // raw SYS_* value from backend
  tenantId: string;
  tenantName?: string;
  tenantLogoUrl?: string | null;
  tenantPrimaryEmail?: string | null;
  tenantPrimaryPhone?: string | null;
  tenantWebsite?: string | null;
  locationId: string;
  userType: 'platform' | 'tenant' | 'doctor' | 'patient';
  enabledModules?: string[];
}

const VALID_UI_ROLES = new Set([
  'ADMIN','DOCTOR','NURSE','RECEPTION','PHARMACY','LAB','BILLING','OT',
  'PLATFORM_OWNER','PLATFORM_ADMIN','PATIENT',
]);

export function clearAuth() {
  localStorage.removeItem('hms_token');
  localStorage.removeItem('hms_refresh_token');
  localStorage.removeItem('hms_user');
}

export function getToken(): string | null {
  return localStorage.getItem('hms_token');
}

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('hms_user');
    if (!raw) return null;
    const parsed: AuthUser = JSON.parse(raw);
    // Migrate stale sessions that stored SYS_* as role — clear and force re-login
    if (parsed.role && !VALID_UI_ROLES.has(parsed.role)) {
      clearAuth();
      return null;
    }
    return parsed;
  } catch (err) { console.error('Failed to parse stored user:', err); return null; }
}

// Maps backend systemRoleId (SYS_*) → frontend UI role key used for nav/redirect
const SYSTEM_ROLE_TO_UI: Record<string, string> = {
  SYS_ORG_ADMIN:          'ADMIN',
  SYS_DOCTOR:             'DOCTOR',
  SYS_SENIOR_DOCTOR:      'DOCTOR',
  SYS_HOD:                'DOCTOR',
  SYS_RECEPTIONIST:       'RECEPTION',
  SYS_FRONT_OFFICE:       'RECEPTION',
  SYS_NURSE:              'NURSE',
  SYS_WARD_NURSE:         'NURSE',
  SYS_CHARGE_NURSE:       'NURSE',
  SYS_PHARMACIST:         'PHARMACY',
  SYS_PHARMACY_INCHARGE:  'PHARMACY',
  SYS_LAB_TECH:           'LAB',
  SYS_LAB_SUPERVISOR:     'LAB',
  SYS_OT_NURSE:           'OT',
  SYS_OT_COORDINATOR:     'OT',
  SYS_BILLING:            'BILLING',
  SYS_BILLING_MANAGER:    'BILLING',
  SYS_COMPLIANCE_OFFICER: 'ADMIN',
  SYS_INSURANCE_EXEC:     'BILLING',
  // Platform roles
  PLATFORM_OWNER:         'PLATFORM_OWNER',
  PLATFORM_ADMIN:         'PLATFORM_ADMIN',
  SUPPORT:                'PLATFORM_ADMIN',
};

export function resolveUiRole(raw: any): string {
  // 0. patient shortcut
  if (raw.userType === 'patient' || raw.role === 'PATIENT' || raw.systemRoleId === 'PATIENT') return 'PATIENT';
  // 1. platform role
  if (raw.platformRole) return SYSTEM_ROLE_TO_UI[raw.platformRole] || raw.platformRole;
  // 2. systemRoleId from role object or top-level
  const sysId = raw.role?.systemRoleId || raw.systemRoleId || raw.role || '';
  if (SYSTEM_ROLE_TO_UI[sysId]) return SYSTEM_ROLE_TO_UI[sysId];
  // 3. already a UI key
  if (VALID_UI_ROLES.has(sysId)) return sysId;
  return 'RECEPTION';
}

export function setAuth(token: string, user: any, refreshToken?: string) {
  const rawSysId = user.platformRole || user.role?.systemRoleId || user.systemRoleId || user.role || '';
  const normalized: AuthUser = {
    sub: user.sub || user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: resolveUiRole(user),
    systemRoleId: rawSysId,
    tenantId: user.tenantId || '',
    tenantName: user.tenantName || '',
    tenantLogoUrl: user.tenantLogoUrl || null,
    tenantPrimaryEmail: user.tenantPrimaryEmail || null,
    tenantPrimaryPhone: user.tenantPrimaryPhone || null,
    tenantWebsite: user.tenantWebsite || null,
    locationId: user.locationId || '',
    userType: user.userType === 'patient' ? 'patient' : user.platformRole ? 'platform' : user.userType || 'tenant',
    enabledModules: user.enabledModules || [],
  };
  localStorage.setItem('hms_token', token);
  localStorage.setItem('hms_user', JSON.stringify(normalized));
  if (refreshToken) localStorage.setItem('hms_refresh_token', refreshToken);
}

export function setRefreshToken(refreshToken: string) {
  localStorage.setItem('hms_refresh_token', refreshToken);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('hms_refresh_token');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
