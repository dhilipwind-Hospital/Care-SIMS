import * as SecureStore from 'expo-secure-store';
import { User } from '../types';

const KEYS = {
  ACCESS_TOKEN: 'ayphen_access_token',
  REFRESH_TOKEN: 'ayphen_refresh_token',
  USER: 'ayphen_user',
  BIOMETRIC_ENABLED: 'ayphen_biometric_enabled',
  LAST_EMAIL: 'ayphen_last_email',
  LAST_LOGIN_TYPE: 'ayphen_last_login_type',
};

export async function setToken(token: string): Promise<void> {
  if (!token || typeof token !== 'string') return;
  await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
}

export async function setRefreshToken(token: string): Promise<void> {
  if (!token || typeof token !== 'string') return;
  await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
}

export async function setUser(user: any): Promise<void> {
  if (!user) return;
  const value = typeof user === 'string' ? user : JSON.stringify(user);
  await SecureStore.setItemAsync(KEYS.USER, value);
}

export async function getUser(): Promise<User | null> {
  const raw = await SecureStore.getItemAsync(KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export async function clearUser(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.USER);
}

export async function clearAll(): Promise<void> {
  await clearTokens();
  await clearUser();
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEYS.BIOMETRIC_ENABLED, String(enabled));
}

export async function isBiometricEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(KEYS.BIOMETRIC_ENABLED);
  return val === 'true';
}

export async function setLastEmail(email: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.LAST_EMAIL, email);
}

export async function getLastEmail(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.LAST_EMAIL);
}

export async function setLastLoginType(type: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.LAST_LOGIN_TYPE, type);
}

export async function getLastLoginType(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.LAST_LOGIN_TYPE);
}
