import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import api from '../lib/api';
import {
  setToken,
  setRefreshToken,
  setUser,
  getUser,
  getToken,
  clearAll,
} from '../lib/storage';
import {
  registerForPushNotifications,
  unregisterPushNotifications,
  addNotificationListeners,
} from '../lib/notifications';
import { User, LoginResponse, LoginType, DoctorAffiliation } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  affiliations: DoctorAffiliation[] | null;
  pushToken: string | null;
  login: (email: string, password: string, type: LoginType) => Promise<LoginResponse>;
  selectOrg: (tenantId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [affiliations, setAffiliations] = useState<DoctorAffiliation[] | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const notificationCleanupRef = useRef<(() => void) | null>(null);

  // Check stored auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Set up push notification listeners when user is authenticated
  useEffect(() => {
    if (user) {
      // Register for push notifications
      registerForPushNotifications().then((token) => {
        if (token) setPushToken(token);
      });

      // Add notification listeners
      const cleanup = addNotificationListeners(
        (notification) => {
          // Handle received notification (app in foreground)
          console.log('Notification received:', notification.request.content.title);
        },
        (response) => {
          // Handle notification tap — navigate to relevant screen
          const data = response.notification.request.content.data;
          if (data?.screen) {
            // Navigation will be handled by the navigation container via deep linking
            console.log('Notification tapped, target screen:', data.screen);
          }
        },
      );
      notificationCleanupRef.current = cleanup;

      return () => {
        if (notificationCleanupRef.current) {
          notificationCleanupRef.current();
          notificationCleanupRef.current = null;
        }
      };
    }
  }, [user]);

  async function checkAuth() {
    try {
      const token = await getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Validate token by calling /auth/me
      try {
        const { data } = await api.get<User>('/auth/me');
        await setUser(data);
        setUserState(data);
      } catch {
        // Token invalid, try stored user as fallback (refresh interceptor may fix it)
        const storedUser = await getUser();
        if (storedUser) {
          setUserState(storedUser);
        } else {
          await clearAll();
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }

  const login = useCallback(
    async (email: string, password: string, type: LoginType): Promise<LoginResponse> => {
      let data: LoginResponse;

      if (type === 'PATIENT') {
        const res = await api.post<LoginResponse>('/auth/patient/login', { email, password });
        data = res.data;
      } else if (type === 'DOCTOR') {
        const res = await api.post<LoginResponse>('/auth/doctor/login', { email, password });
        data = res.data;
      } else {
        // Staff login: try tenant first, then platform if tenant fails
        try {
          const res = await api.post<LoginResponse>('/auth/login', { email, password });
          data = res.data;
        } catch (tenantErr: any) {
          // If tenant login fails, try platform login
          try {
            const res = await api.post<LoginResponse>('/auth/platform/login', { email, password });
            data = res.data;
          } catch {
            // Both failed — throw the original tenant error
            throw tenantErr;
          }
        }
      }

      // Normalize: platform login returns user directly, doctor returns doctor field
      const accessToken = data.accessToken || data.token;
      const refreshToken = data.refreshToken;
      const userObj = data.user || data.doctor || data;

      // If multi-org selection required (doctor with multiple affiliations)
      if (data.requiresOrgSelection && data.affiliations?.length) {
        if (accessToken) await setToken(accessToken);
        if (refreshToken) await setRefreshToken(refreshToken);
        setAffiliations(data.affiliations);
        return data;
      }

      // Doctor login returns affiliations — needs org selection
      if (data.affiliations && data.affiliations.length > 1) {
        if (accessToken) await setToken(accessToken);
        if (refreshToken) await setRefreshToken(refreshToken);
        setAffiliations(data.affiliations);
        return { ...data, requiresOrgSelection: true };
      }

      if (accessToken) await setToken(accessToken);
      if (refreshToken) await setRefreshToken(refreshToken);

      // Normalize user object with role
      const normalizedUser = {
        ...userObj,
        role: userObj.role || userObj.platformRole || userObj.systemRoleId || 'ADMIN',
      };
      await setUser(normalizedUser);
      setUserState(normalizedUser);
      setAffiliations(null);
      return data;
    },
    [],
  );

  const selectOrg = useCallback(async (tenantId: string) => {
    const { data } = await api.post<LoginResponse>('/auth/select-org', { tenantId });
    if (data.accessToken) await setToken(data.accessToken);
    if (data.refreshToken) await setRefreshToken(data.refreshToken);
    const userObj = data.user || data;
    await setUser(userObj);
    setUserState(userObj);
    setAffiliations(null);
  }, []);

  const logout = useCallback(async () => {
    // Unregister push token from backend
    if (pushToken) {
      try {
        await unregisterPushNotifications(pushToken);
      } catch {
        // Ignore if this fails — still log out locally
      }
      setPushToken(null);
    }

    // Clean up notification listeners
    if (notificationCleanupRef.current) {
      notificationCleanupRef.current();
      notificationCleanupRef.current = null;
    }

    await clearAll();
    setUserState(null);
    setAffiliations(null);
  }, [pushToken]);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get<User>('/auth/me');
      await setUser(data);
      setUserState(data);
    } catch {
      // ignore
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        affiliations,
        pushToken,
        login,
        selectOrg,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
