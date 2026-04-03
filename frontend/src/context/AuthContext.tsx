import React, { createContext, useContext, useState, useCallback } from 'react';
import { type AuthUser, getUser, setAuth, clearAuth } from '../lib/auth';
import api from '../lib/api';

export interface DoctorAffiliation {
  affiliationId: string;
  orgName: string;
  orgId: string;
  locationId: string;
  designation: string;
  employmentType: string;
  status: string;
  todaysPatients?: number;
}

export interface MfaPending {
  mfaToken: string;
  email: string;
}

interface AuthCtx {
  user: AuthUser | null;
  pendingDoctorAffiliations: DoctorAffiliation[] | null;
  pendingDoctorToken: string | null;
  pendingMfa: MfaPending | null;
  /** Returns true if doctor needs to select an org (multi-affiliation) */
  login: (email: string, password: string, loginType: string) => Promise<boolean>;
  verifyMfa: (code: string) => Promise<void>;
  selectDoctorOrg: (affiliationId: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getUser());
  const [loading, setLoading] = useState(false);
  const [pendingDoctorAffiliations, setPendingDoctorAffiliations] = useState<DoctorAffiliation[] | null>(null);
  const [pendingDoctorToken, setPendingDoctorToken] = useState<string | null>(null);
  const [pendingMfa, setPendingMfa] = useState<MfaPending | null>(null);

  const login = useCallback(async (email: string, password: string, loginType: string): Promise<boolean> => {
    setLoading(true);
    try {
      // Auto-detect login type: try tenant → platform → doctor
      let data: any;
      let resolvedType = loginType;

      if (loginType === 'tenant' || loginType === 'auto') {
        try {
          data = (await api.post('/auth/login', { email, password })).data;
          resolvedType = 'tenant';
        } catch (err: any) {
          const status = err.response?.status;
          if (status === 401 || status === 403 || status === 404 || status === 500) {
            try {
              data = (await api.post('/auth/platform/login', { email, password })).data;
              resolvedType = 'platform';
            } catch (err) {
              console.error('Platform login fallback failed, trying doctor login:', err);
              data = (await api.post('/auth/doctor/login', { email, password })).data;
              resolvedType = 'doctor';
            }
          } else {
            throw err;
          }
        }
      } else if (loginType === 'platform') {
        data = (await api.post('/auth/platform/login', { email, password })).data;
        resolvedType = 'platform';
      } else if (loginType === 'doctor') {
        data = (await api.post('/auth/doctor/login', { email, password })).data;
        resolvedType = 'doctor';
      } else {
        data = (await api.post('/auth/login', { email, password })).data;
      }

      // MFA challenge — tenant login returned mfaRequired
      if (data.mfaRequired && data.mfaToken) {
        setPendingMfa({ mfaToken: data.mfaToken, email: email });
        return false;
      }

      if (resolvedType === 'doctor') {
        // Backend returns { accessToken, doctor: {...}, affiliations: [...] }
        const doctorInfo = data.doctor || data.user || {};
        const affiliations: DoctorAffiliation[] = (data.affiliations || []).map((a: any) => ({
          affiliationId: a.affiliationId,
          orgName: a.orgName,
          orgId: a.tenantId,
          locationId: a.locationId || '',
          designation: a.designation || 'Doctor',
          employmentType: a.employmentType || 'FULL_TIME',
          status: a.status,
          todaysPatients: a.todaysPatients,
        }));

        const activeAffiliations = affiliations.filter(a => a.status === 'ACTIVE' || a.status === 'ACCEPTED');

        if (activeAffiliations.length > 1) {
          // Multiple orgs — store partial token and affiliations, redirect to org selector
          setPendingDoctorToken(data.accessToken);
          setPendingDoctorAffiliations(affiliations);
          return true;
        } else if (activeAffiliations.length === 1) {
          // Single org — auto select and proceed
          const scopedRes = await api.post('/auth/doctor/select-org',
            { affiliationId: activeAffiliations[0].affiliationId },
            { headers: { Authorization: `Bearer ${data.accessToken}` } }
          );
          // Build user obj from doctor + affiliation info since backend doesn't return full user
          const doctorUser = {
            sub: doctorInfo.id,
            email: doctorInfo.email,
            firstName: doctorInfo.firstName,
            lastName: doctorInfo.lastName,
            role: 'DOCTOR',
            userType: 'doctor' as const,
            tenantId: activeAffiliations[0].orgId,
            locationId: activeAffiliations[0].locationId,
          };
          setAuth(scopedRes.data.accessToken, doctorUser, scopedRes.data.refreshToken);
          setUser(getUser());
          return false;
        } else {
          // No active affiliations — let doctor log in to view their profile
          const doctorUser = {
            sub: doctorInfo.id,
            email: doctorInfo.email,
            firstName: doctorInfo.firstName,
            lastName: doctorInfo.lastName,
            role: 'DOCTOR',
            userType: 'doctor' as const,
            tenantId: '',
            locationId: '',
          };
          setAuth(data.accessToken, doctorUser);
          setUser(getUser());
          return false;
        }
      }

      setAuth(data.accessToken, data.user, data.refreshToken);
      setUser(getUser());
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyMfa = useCallback(async (code: string) => {
    if (!pendingMfa) throw new Error('No pending MFA session');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/mfa/verify', { code }, {
        headers: { Authorization: `Bearer ${pendingMfa.mfaToken}` },
      });
      setAuth(data.accessToken, data.user, data.refreshToken);
      setUser(getUser());
      setPendingMfa(null);
    } finally {
      setLoading(false);
    }
  }, [pendingMfa]);

  const selectDoctorOrg = useCallback(async (affiliationId: string) => {
    if (!pendingDoctorToken) throw new Error('No pending doctor session');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/doctor/select-org',
        { affiliationId },
        { headers: { Authorization: `Bearer ${pendingDoctorToken}` } }
      );
      setAuth(data.accessToken, { ...data.user, userType: 'doctor' }, data.refreshToken);
      setUser(getUser());
      setPendingDoctorAffiliations(null);
      setPendingDoctorToken(null);
    } finally {
      setLoading(false);
    }
  }, [pendingDoctorToken]);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    setPendingDoctorAffiliations(null);
    setPendingDoctorToken(null);
    setPendingMfa(null);
    window.location.href = '/';
  }, []);

  return (
    <AuthContext.Provider value={{ user, pendingDoctorAffiliations, pendingDoctorToken, pendingMfa, login, verifyMfa, selectDoctorOrg, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
