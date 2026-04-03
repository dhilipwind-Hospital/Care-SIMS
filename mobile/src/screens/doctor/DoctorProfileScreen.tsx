import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme';
import { Header, ListItem } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DoctorProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
  avatar?: string;
}

export default function DoctorProfileScreen() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get<DoctorProfile>('/auth/me');
      setProfile(data);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch {
            // logout always clears local state
          }
        },
      },
    ]);
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.container}>
        <Header title="Profile" />
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="Profile" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar & Info */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(profile?.name)}</Text>
          </View>
          <Text style={styles.name}>{profile?.name ?? '--'}</Text>
          <Text style={styles.email}>{profile?.email ?? '--'}</Text>
          {profile?.specialization && (
            <View style={styles.specBadge}>
              <Text style={styles.specText}>{profile.specialization}</Text>
            </View>
          )}
          {profile?.phone && (
            <Text style={styles.phone}>
              <Ionicons name="call-outline" size={13} color={colors.textTertiary} /> {profile.phone}
            </Text>
          )}
        </View>

        {/* Menu Items */}
        <View style={styles.menuCard}>
          <ListItem
            title="Change Password"
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />}
            onPress={() => {/* navigate to change password */}}
          />
          <ListItem
            title="Settings"
            leftIcon={<Ionicons name="settings-outline" size={20} color={colors.textSecondary} />}
            onPress={() => {/* navigate to settings */}}
          />
          <ListItem
            title="About"
            leftIcon={<Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />}
            onPress={() => {/* navigate to about */}}
          />
          <ListItem
            title="Logout"
            leftIcon={<Ionicons name="log-out-outline" size={20} color={colors.danger} />}
            onPress={handleLogout}
            borderBottom={false}
            rightContent={<Text style={styles.logoutLabel}>Logout</Text>}
            showChevron={false}
          />
        </View>
      </ScrollView>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loader: {
    marginTop: 40,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['2xl'],
  },
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    ...typography.h1,
    color: colors.white,
  },
  name: {
    ...typography.h3,
    color: colors.text,
  },
  email: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 4,
  },
  specBadge: {
    backgroundColor: colors.primaryLight + '20',
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    marginTop: spacing.sm,
  },
  specText: {
    ...typography.label,
    color: colors.primary,
  },
  phone: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  menuCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadow.sm,
  },
  logoutLabel: {
    ...typography.label,
    color: colors.danger,
  },
});
