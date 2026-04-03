import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme';
import { Header, StatusBadge, getStatusVariant } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Appointment {
  id: string;
  doctorName?: string;
  doctor?: { name: string };
  date?: string;
  time?: string;
  department?: string;
  status: string;
}

type IoniconsName = keyof typeof Ionicons.glyphMap;

interface QuickAction {
  label: string;
  icon: IoniconsName;
  color: string;
  route: string;
}

const quickActions: QuickAction[] = [
  { label: 'Book Appointment', icon: 'calendar-outline', color: colors.primary, route: 'BookAppointment' },
  { label: 'Prescriptions', icon: 'document-text-outline', color: colors.info, route: 'PatientPrescriptions' },
  { label: 'Lab Reports', icon: 'flask-outline', color: colors.purple, route: 'PatientLabReports' },
  { label: 'Billing', icon: 'card-outline', color: colors.warning, route: 'PatientBilling' },
];

export default function PatientHomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [apptRes, notifRes] = await Promise.allSettled([
        api.get('/auth/patient/me/appointments'),
        api.get('/notifications/unread-count'),
      ]);

      if (apptRes.status === 'fulfilled') {
        const list = Array.isArray(apptRes.value.data)
          ? apptRes.value.data
          : apptRes.value.data?.data ?? apptRes.value.data?.appointments ?? [];
        setAppointments(list);
      }

      if (notifRes.status === 'fulfilled') {
        const count = notifRes.value.data?.count ?? notifRes.value.data?.unreadCount ?? notifRes.value.data ?? 0;
        setUnreadCount(typeof count === 'number' ? count : 0);
      }
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Failed to load data' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  const firstName = user?.name?.split(' ')[0] ?? 'Patient';

  const upcoming = appointments.filter(
    (a) => ['SCHEDULED', 'BOOKED', 'CONFIRMED'].includes(a.status?.toUpperCase()),
  );
  const nextAppointment = upcoming[0];

  const formatDate = (d?: string) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="Home" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Welcome */}
        <Text style={styles.welcome}>Hello, {firstName} {'\uD83D\uDC4B'}</Text>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : (
          <>
            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="calendar" size={22} color={colors.primary} />
                <Text style={styles.statValue}>{upcoming.length}</Text>
                <Text style={styles.statLabel}>Upcoming</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="notifications" size={22} color={colors.warning} />
                <Text style={styles.statValue}>{unreadCount}</Text>
                <Text style={styles.statLabel}>Notifications</Text>
              </View>
            </View>

            {/* Next Appointment */}
            {nextAppointment && (
              <TouchableOpacity
                style={styles.nextApptCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Appointments')}
              >
                <View style={styles.nextApptHeader}>
                  <Text style={styles.nextApptTitle}>Next Appointment</Text>
                  <StatusBadge label={nextAppointment.status} variant={getStatusVariant(nextAppointment.status)} />
                </View>
                <View style={styles.nextApptBody}>
                  <Ionicons name="person-outline" size={18} color={colors.primary} />
                  <Text style={styles.nextApptDoctor}>
                    {nextAppointment.doctorName ?? nextAppointment.doctor?.name ?? '--'}
                  </Text>
                </View>
                <View style={styles.nextApptBody}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.nextApptMeta}>
                    {formatDate(nextAppointment.date)} {nextAppointment.time ? `at ${nextAppointment.time}` : ''}
                  </Text>
                </View>
                {nextAppointment.department && (
                  <View style={styles.nextApptBody}>
                    <Ionicons name="business-outline" size={18} color={colors.textSecondary} />
                    <Text style={styles.nextApptMeta}>{nextAppointment.department}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.route}
                  style={styles.actionCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate(action.route)}
                >
                  <View style={[styles.actionIconWrap, { backgroundColor: action.color + '15' }]}>
                    <Ionicons name={action.icon} size={26} color={action.color} />
                  </View>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
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
  content: {
    padding: spacing.base,
    paddingBottom: spacing['2xl'],
  },
  welcome: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  loader: {
    marginTop: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    alignItems: 'center',
    ...shadow.sm,
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
    marginTop: 4,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  nextApptCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    ...shadow.sm,
  },
  nextApptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  nextApptTitle: {
    ...typography.label,
    color: colors.primary,
  },
  nextApptBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
  },
  nextApptDoctor: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  nextApptMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadow.sm,
  },
  actionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  actionLabel: {
    ...typography.label,
    color: colors.text,
    textAlign: 'center',
  },
});
