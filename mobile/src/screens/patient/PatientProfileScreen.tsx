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
import { Header, SectionCard, ListItem } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PatientProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  allergies?: string[];
  conditions?: string[];
}

export default function PatientProfileScreen() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get<PatientProfile>('/auth/patient/me/profile');
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

  const formatDate = (d?: string) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.container}>
        <Header title="My Profile" />
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="My Profile" />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(profile?.name)}</Text>
          </View>
          <Text style={styles.name}>{profile?.name ?? '--'}</Text>
        </View>

        {/* Personal */}
        <SectionCard title="Personal Information">
          <InfoRow label="Name" value={profile?.name} />
          <InfoRow label="Date of Birth" value={formatDate(profile?.dateOfBirth)} />
          <InfoRow label="Gender" value={profile?.gender} />
          <InfoRow label="Blood Group" value={profile?.bloodGroup} />
        </SectionCard>

        {/* Contact */}
        <SectionCard title="Contact">
          <InfoRow label="Phone" value={profile?.phone} />
          <InfoRow label="Email" value={profile?.email} />
          <InfoRow label="Address" value={profile?.address} />
        </SectionCard>

        {/* Medical */}
        <SectionCard title="Medical Information">
          <Text style={styles.infoLabel}>Allergies</Text>
          {profile?.allergies && profile.allergies.length > 0 ? (
            <View style={styles.chipsWrap}>
              {profile.allergies.map((a, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{a}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.infoValue}>None recorded</Text>
          )}

          <Text style={[styles.infoLabel, { marginTop: spacing.md }]}>Conditions</Text>
          {profile?.conditions && profile.conditions.length > 0 ? (
            <View style={styles.chipsWrap}>
              {profile.conditions.map((c, i) => (
                <View key={i} style={[styles.chip, styles.conditionChip]}>
                  <Text style={styles.conditionChipText}>{c}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.infoValue}>None recorded</Text>
          )}
        </SectionCard>

        {/* Menu Items */}
        <View style={styles.menuCard}>
          <ListItem
            title="Change Password"
            leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />}
            onPress={() => {/* navigate */}}
          />
          <ListItem
            title="Switch Hospital"
            leftIcon={<Ionicons name="business-outline" size={20} color={colors.textSecondary} />}
            onPress={() => {/* navigate */}}
          />
          <ListItem
            title="About"
            leftIcon={<Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />}
            onPress={() => {/* navigate */}}
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

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value || '--'}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  value: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    maxWidth: '60%',
    textAlign: 'right',
  },
});

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
  infoLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.dangerLight,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  chipText: {
    ...typography.bodySmall,
    color: colors.danger,
    fontWeight: '600',
  },
  conditionChip: {
    backgroundColor: colors.infoLight,
  },
  conditionChipText: {
    ...typography.bodySmall,
    color: colors.info,
    fontWeight: '600',
  },
  menuCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginTop: spacing.md,
    ...shadow.sm,
  },
  logoutLabel: {
    ...typography.label,
    color: colors.danger,
  },
});
