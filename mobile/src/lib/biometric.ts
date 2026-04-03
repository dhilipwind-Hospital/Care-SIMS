import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'hms_biometric_enabled';
const BIOMETRIC_EMAIL_KEY = 'hms_biometric_email';

export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

export async function getBiometricType(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION))
    return 'Face ID';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT))
    return 'Touch ID';
  return 'Biometric';
}

export async function authenticateWithBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to Ayphen HMS',
    cancelLabel: 'Use Password',
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function isBiometricEnabled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return val === 'true';
}

export async function enableBiometric(email: string): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
  await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, email);
}

export async function disableBiometric(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY);
}

export async function getBiometricEmail(): Promise<string | null> {
  return SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
}
