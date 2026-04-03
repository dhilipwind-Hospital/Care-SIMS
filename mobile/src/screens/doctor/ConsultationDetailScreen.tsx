import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme';
import { Header, SectionCard, StatusBadge, getStatusVariant, Button } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Diagnosis {
  id?: string;
  code?: string;
  description?: string;
  type?: string;
}

interface ConsultationDetail {
  id: string;
  status: string;
  patient?: {
    id: string;
    name: string;
    age?: number;
    gender?: string;
    bloodGroup?: string;
  };
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  diagnoses?: Diagnosis[];
  chiefComplaint?: string;
  createdAt?: string;
}

type RouteParams = { ConsultationDetail: { consultationId: string } };

export default function ConsultationDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, 'ConsultationDetail'>>();
  const { consultationId } = route.params;

  const [data, setData] = useState<ConsultationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [consultationId]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/consultations/${consultationId}`);
      setData(res);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load consultation' });
    } finally {
      setLoading(false);
    }
  };

  const completeConsultation = () => {
    Alert.alert('Complete Consultation', 'Are you sure you want to complete this consultation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          setCompleting(true);
          try {
            await api.patch(`/consultations/${consultationId}/complete`);
            Toast.show({ type: 'success', text1: 'Consultation completed' });
            fetchDetail();
          } catch (err: any) {
            Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to complete' });
          } finally {
            setCompleting(false);
          }
        },
      },
    ]);
  };

  const canComplete = data && ['DRAFT', 'IN_PROGRESS'].includes(data.status);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.container}>
        <Header title="Consultation" onBack={() => navigation.goBack()} />
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.container}>
        <Header title="Consultation" onBack={() => navigation.goBack()} />
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>Consultation not found</Text>
        </View>
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header
        title="Consultation"
        onBack={() => navigation.goBack()}
        rightAction={<StatusBadge label={data.status} variant={getStatusVariant(data.status)} />}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Patient Info Header */}
        <View style={styles.patientHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {data.patient?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{data.patient?.name ?? 'Unknown'}</Text>
            <Text style={styles.patientMeta}>
              {data.patient?.age ? `${data.patient.age} yrs` : ''}
              {data.patient?.gender ? ` | ${data.patient.gender}` : ''}
              {data.patient?.bloodGroup ? ` | ${data.patient.bloodGroup}` : ''}
            </Text>
          </View>
        </View>

        {data.chiefComplaint && (
          <View style={styles.complaintCard}>
            <Text style={styles.complaintLabel}>Chief Complaint</Text>
            <Text style={styles.complaintText}>{data.chiefComplaint}</Text>
          </View>
        )}

        <SectionCard title="Subjective" collapsible defaultExpanded>
          <Text style={styles.sectionText}>{data.subjective || 'No data recorded'}</Text>
        </SectionCard>

        <SectionCard title="Objective" collapsible defaultExpanded={false}>
          <Text style={styles.sectionText}>{data.objective || 'No data recorded'}</Text>
        </SectionCard>

        <SectionCard title="Assessment" collapsible defaultExpanded={false}>
          <Text style={styles.sectionText}>{data.assessment || 'No data recorded'}</Text>
          {data.diagnoses && data.diagnoses.length > 0 && (
            <View style={styles.diagnosesList}>
              <Text style={styles.subHeading}>Diagnoses</Text>
              {data.diagnoses.map((d, i) => (
                <View key={d.id ?? i} style={styles.diagnosisRow}>
                  {d.code && <Text style={styles.diagCode}>{d.code}</Text>}
                  <Text style={styles.diagDesc}>{d.description ?? '--'}</Text>
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard title="Plan" collapsible defaultExpanded={false}>
          <Text style={styles.sectionText}>{data.plan || 'No data recorded'}</Text>
        </SectionCard>

        {canComplete && (
          <Button
            title="Complete Consultation"
            onPress={completeConsultation}
            loading={completing}
            style={styles.completeBtn}
          />
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
  loader: {
    marginTop: 40,
  },
  errorWrap: {
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
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.md,
    ...shadow.sm,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.h3,
    color: colors.white,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    ...typography.h4,
    color: colors.text,
  },
  patientMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  complaintCard: {
    backgroundColor: colors.warningLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  complaintLabel: {
    ...typography.label,
    color: colors.warning,
    marginBottom: 4,
  },
  complaintText: {
    ...typography.body,
    color: colors.text,
  },
  sectionText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
  },
  diagnosesList: {
    marginTop: spacing.md,
  },
  subHeading: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  diagnosisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  diagCode: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.primary,
    marginRight: spacing.sm,
    minWidth: 60,
  },
  diagDesc: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
  },
  completeBtn: {
    marginTop: spacing.lg,
  },
});
