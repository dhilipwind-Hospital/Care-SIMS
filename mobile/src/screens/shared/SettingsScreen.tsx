import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography, fontSize, fontWeight } from '../../theme/typography';
import { borderRadius, shadow } from '../../theme';
import { StatusBadge, getStatusVariant, ListItem } from '../../components';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  getBiometricType,
  enableBiometric,
  disableBiometric,
} from '../../lib/biometric';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  tenantName?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SettingsScreen({ navigation }: { navigation?: any }) {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setProfile(data);
    } catch {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  const checkBiometric = useCallback(async () => {
    const available = await isBiometricAvailable();
    setBiometricAvailable(available);
    if (available) {
      const type = await getBiometricType();
      setBiometricLabel(type);
      const enabled = await isBiometricEnabled();
      setBiometricEnabled(enabled);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    checkBiometric();
  }, [fetchProfile, checkBiometric]);

  const handleBiometricToggle = async (value: boolean) => {
    if (value && profile?.email) {
      await enableBiometric(profile.email);
      setBiometricEnabled(true);
    } else {
      await disableBiometric();
      setBiometricEnabled(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const handleChangePassword = () => {
    if (navigation) {
      navigation.navigate('ChangePassword');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 12 }}>{error}</Text>
          <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' }}>Pull down to retry or check your connection</Text>
          <TouchableOpacity onPress={() => { setError(null); setLoading(true); fetchProfile(); }} style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#0F766E', borderRadius: 8 }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* User Info Card */}
      {profile && (
        <View style={[styles.profileCard, shadow.base]}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person-outline" size={32} color={colors.primary} />
          </View>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          <StatusBadge label={profile.role} variant={getStatusVariant(profile.role)} />
          {profile.tenantName && (
            <Text style={styles.tenantName}>{profile.tenantName}</Text>
          )}
          {profile.phone && (
            <Text style={styles.phone}>{profile.phone}</Text>
          )}
        </View>
      )}

      {/* Biometric Toggle */}
      {biometricAvailable && (
        <View style={[styles.biometricSection, shadow.base]}>
          <View style={styles.biometricRow}>
            <View style={styles.biometricLeft}>
              <Ionicons
                name={biometricLabel === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                size={22}
                color={colors.primary}
              />
              <View style={styles.biometricTextContainer}>
                <Text style={styles.biometricTitle}>{biometricLabel} Login</Text>
                <Text style={styles.biometricSubtitle}>
                  Use {biometricLabel} for quick sign-in
                </Text>
              </View>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: colors.border, true: colors.primary + '60' }}
              thumbColor={biometricEnabled ? colors.primary : colors.textSecondary}
            />
          </View>
        </View>
      )}

      {/* Menu Items */}
      <View style={styles.menuSection}>
        <ListItem
          title="Change Password"
          subtitle="Update your account password"
          leftIcon={<Ionicons name="lock-closed-outline" size={22} color={colors.primary} />}
          onPress={handleChangePassword}
        />
        <ListItem
          title="About"
          subtitle="Ayphen HMS v1.0.0"
          leftIcon={<Ionicons name="information-circle-outline" size={22} color={colors.info} />}
          onPress={() =>
            Alert.alert(
              'Ayphen HMS',
              'Hospital Management System\nVersion 1.0.0\n\nBuilt with care for healthcare professionals.',
            )
          }
        />
        <ListItem
          title="Logout"
          subtitle="Sign out of your account"
          leftIcon={<Ionicons name="log-out-outline" size={22} color={colors.danger} />}
          onPress={handleLogout}
          borderBottom={false}
        />
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  tenantName: {
    ...typography.bodySmall,
    color: colors.primary,
    marginTop: 8,
  },
  phone: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 4,
  },
  biometricSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: 16,
    marginBottom: 20,
  },
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  biometricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  biometricTextContainer: {
    flex: 1,
  },
  biometricTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  biometricSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  menuSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
});
