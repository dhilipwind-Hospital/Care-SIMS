import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { LoginType } from '../../types';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  getBiometricType,
  getBiometricEmail,
  authenticateWithBiometric,
  enableBiometric,
} from '../../lib/biometric';
import { getRefreshToken } from '../../lib/storage';
import api from '../../lib/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

type AuthStackParamList = {
  Login: undefined;
  SelectOrg: undefined;
  ForgotPassword: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LOGIN_TYPES: { key: LoginType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'TENANT', label: 'Staff', icon: 'people-outline' },
  { key: 'DOCTOR', label: 'Doctor', icon: 'medkit-outline' },
  { key: 'PATIENT', label: 'Patient', icon: 'person-outline' },
];

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginType, setLoginType] = useState<LoginType>('TENANT');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');

  // Check biometric availability on mount
  useEffect(() => {
    async function checkBiometric() {
      const available = await isBiometricAvailable();
      const enabled = await isBiometricEnabled();
      if (available && enabled) {
        setBiometricReady(true);
        const type = await getBiometricType();
        setBiometricLabel(type);
      }
    }
    checkBiometric();
  }, []);

  async function handleBiometricLogin() {
    setLoading(true);
    try {
      const success = await authenticateWithBiometric();
      if (!success) {
        setLoading(false);
        return;
      }

      const storedEmail = await getBiometricEmail();
      const refreshToken = await getRefreshToken();

      if (!storedEmail || !refreshToken) {
        Toast.show({
          type: 'error',
          text1: 'Biometric Login Failed',
          text2: 'No stored credentials found. Please login with password.',
        });
        setLoading(false);
        return;
      }

      // Try to refresh the session using the stored refresh token
      const { data } = await api.post('/auth/refresh', { refreshToken });
      if (data.accessToken) {
        // Trigger a full login flow via the auth context by calling /auth/me
        const { setToken, setRefreshToken, setUser } = await import('../../lib/storage');
        await setToken(data.accessToken);
        if (data.refreshToken) await setRefreshToken(data.refreshToken);

        // Fetch user profile and complete login
        const meResponse = await api.get('/auth/me');
        await setUser(meResponse.data);
        // Force re-check auth by reloading — the AuthContext will pick up the new token
        // We do a window-level reload equivalent by navigating
        Toast.show({
          type: 'success',
          text1: 'Welcome back!',
          text2: `Logged in with ${biometricLabel}`,
        });
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Biometric Login Failed',
        text2: 'Session expired. Please login with your password.',
      });
    } finally {
      setLoading(false);
    }
  }

  function validate(): boolean {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Enter a valid email';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;

    setLoading(true);
    try {
      const response = await login(email.trim(), password, loginType);
      if (response.requiresOrgSelection && response.affiliations?.length) {
        navigation.navigate('SelectOrg');
      } else {
        // Prompt to enable biometric login if available and not already enabled
        const available = await isBiometricAvailable();
        const alreadyEnabled = await isBiometricEnabled();
        if (available && !alreadyEnabled) {
          const type = await getBiometricType();
          Alert.alert(
            `Enable ${type}?`,
            `Would you like to use ${type} for faster login next time?`,
            [
              { text: 'Not Now', style: 'cancel' },
              {
                text: 'Enable',
                onPress: () => enableBiometric(email.trim()),
              },
            ],
          );
        }
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || 'Login failed. Please try again.';
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Ionicons name="heart" size={48} color={colors.primary} />
            <View style={styles.crossOverlay}>
              <Ionicons name="add" size={24} color={colors.white} />
            </View>
          </View>
          <Text style={styles.brandText}>Ayphen HMS</Text>
          <Text style={styles.tagline}>Hospital Management System</Text>
        </View>

        {/* Role Selector */}
        <View style={styles.roleSelector}>
          {LOGIN_TYPES.map((type) => {
            const isActive = loginType === type.key;
            return (
              <TouchableOpacity
                key={type.key}
                style={[styles.roleButton, isActive && styles.roleButtonActive]}
                onPress={() => setLoginType(type.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={type.icon}
                  size={20}
                  color={isActive ? colors.white : colors.textSecondary}
                />
                <Text style={[styles.roleLabel, isActive && styles.roleLabelActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
            }}
            error={errors.email}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textSecondary} />}
          />

          <View>
            <Input
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
              }}
              error={errors.password}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              leftIcon={
                <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
              }
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <Button
            title="Login"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.loginButton}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotLink}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Biometric Login Button */}
          {biometricReady && (
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Ionicons
                name={biometricLabel === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                size={24}
                color={colors.primary}
              />
              <Text style={styles.biometricText}>Login with {biometricLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  crossOverlay: {
    position: 'absolute',
    top: 18,
    left: 28,
    backgroundColor: colors.primary,
    borderRadius: 4,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    ...typography.h2,
    color: colors.primary,
  },
  tagline: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 4,
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
  },
  roleLabel: {
    ...typography.label,
    color: colors.textSecondary,
  },
  roleLabelActive: {
    color: colors.white,
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 32,
    padding: 8,
  },
  loginButton: {
    marginTop: 8,
  },
  forgotLink: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  forgotText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '08',
    gap: 8,
  },
  biometricText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
