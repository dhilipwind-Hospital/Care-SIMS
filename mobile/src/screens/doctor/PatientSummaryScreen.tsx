import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme';
import { Header, SectionCard, Button } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PatientSummary {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  allergies?: string[];
  lastVitals?: {
    bloodPressure?: string;
    heartRate?: number;
    spO2?: number;
    temperature?: number;
  };
  activePrescriptions?: number;
  upcomingAppointments?: number;
  lastConsultationDate?: string;
}

type RouteParams = { PatientSummary: { patientId: string } };

export default function PatientSummaryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'PatientSummary'>>();
  const { patientId } = route.params;

  const [data, setData] = useState<PatientSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, [patientId]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/patients/summary/${patientId}`);
      setData(res);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load summary' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d?: string) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.container}>
        <Header title="Patient Summary" onBack={() => navigation.goBack()} />
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.container}>
        <Header title="Patient Summary" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>Patient not found</Text>
        </View>
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="Patient Summary" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Patient Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{data.name?.charAt(0)?.toUpperCase() ?? '?'}</Text>
          </View>
          <Text style={styles.name}>{data.name}</Text>
          <Text style={styles.details}>
            {data.age ? `${data.age} yrs` : ''}
            {data.gender ? ` | ${data.gender}` : ''}
            {data.bloodGroup ? ` | ${data.bloodGroup}` : ''}
          </Text>
        </View>

        {/* Allergies */}
        {data.allergies && data.allergies.length > 0 && (
          <SectionCard title="Allergies">
            <View style={styles.chipsWrap}>
              {data.allergies.map((a, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{a}</Text>
                </View>
              ))}
            </View>
          </SectionCard>
        )}

        {/* Last Vitals */}
        {data.lastVitals && (
          <SectionCard title="Last Vitals">
            <View style={styles.vitalsGrid}>
              <View style={styles.vitalItem}>
                <Ionicons name="heart-outline" size={20} color={colors.danger} />
                <Text style={styles.vitalValue}>{data.lastVitals.bloodPressure ?? '--'}</Text>
                <Text style={styles.vitalLabel}>BP</Text>
              </View>
              <View style={styles.vitalItem}>
                <Ionicons name="pulse-outline" size={20} color={colors.info} />
                <Text style={styles.vitalValue}>{data.lastVitals.heartRate ?? '--'}</Text>
                <Text style={styles.vitalLabel}>HR (bpm)</Text>
              </View>
              <View style={styles.vitalItem}>
                <Ionicons name="water-outline" size={20} color={colors.primary} />
                <Text style={styles.vitalValue}>{data.lastVitals.spO2 != null ? `${data.lastVitals.spO2}%` : '--'}</Text>
                <Text style={styles.vitalLabel}>SpO2</Text>
              </View>
              <View style={styles.vitalItem}>
                <Ionicons name="thermometer-outline" size={20} color={colors.warning} />
                <Text style={styles.vitalValue}>{data.lastVitals.temperature != null ? `${data.lastVitals.temperature}\u00B0` : '--'}</Text>
                <Text style={styles.vitalLabel}>Temp</Text>
              </View>
            </View>
          </SectionCard>
        )}

        {/* Quick Stats */}
        <SectionCard title="Quick Stats">
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.activePrescriptions ?? 0}</Text>
              <Text style={styles.statLabel}>Active Rx</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.upcomingAppointments ?? 0}</Text>
              <Text style={styles.statLabel}>Upcoming Appts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatDate(data.lastConsultationDate)}</Text>
              <Text style={styles.statLabel}>Last Consult</Text>
            </View>
          </View>
        </SectionCard>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="View Full History"
            onPress={() => {/* navigation.navigate('PatientHistory', { patientId }) */}}
            variant="outline"
            style={styles.actionBtn}
          />
          <Button
            title="Book Appointment"
            onPress={() => {/* navigation.navigate('BookAppointment', { patientId }) */}}
            style={styles.actionBtn}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing['2xl'],
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.xl,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    ...typography.h2,
    color: colors.white,
  },
  name: {
    ...typography.h3,
    color: colors.text,
  },
  details: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 4,
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
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  vitalItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  vitalValue: {
    ...typography.h4,
    color: colors.text,
    marginTop: 4,
  },
  vitalLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statValue: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  actionBtn: {
    flex: 1,
  },
});
