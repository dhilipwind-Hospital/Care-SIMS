import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import { typography, fontSize, fontWeight } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme';
import { Header, KpiCard, StatusBadge, getStatusVariant, EmptyState, Button } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MedicationItem {
  id?: string;
  drugName?: string;
  drug?: { name: string };
  dose?: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
}

interface Prescription {
  id: string;
  rxNumber?: string;
  prescriptionNumber?: string;
  patient?: { name: string };
  patientName?: string;
  doctor?: { name: string };
  doctorName?: string;
  items?: MedicationItem[];
  medications?: MedicationItem[];
  itemCount?: number;
  status: string;
  createdAt?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PharmacyDispenseScreen() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchPrescriptions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/prescriptions', {
        params: { status: 'SENT_TO_PHARMACY', page: 1, limit: 20 },
      });
      const list = Array.isArray(data) ? data : data.data ?? data.prescriptions ?? [];
      setPrescriptions(list);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load prescriptions' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPrescriptions(true);
  }, [fetchPrescriptions]);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleDispense = async (rxId: string) => {
    setActionLoadingId(rxId);
    try {
      await api.post(`/pharmacy/prescriptions/${rxId}/dispense`);
      Toast.show({ type: 'success', text1: 'Prescription dispensed' });
      fetchPrescriptions(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to dispense' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = (rxId: string) => {
    Alert.alert('Reject Prescription', 'Are you sure you want to reject this prescription?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setActionLoadingId(rxId);
          try {
            await api.patch(`/prescriptions/${rxId}/status`, { status: 'REJECTED' });
            Toast.show({ type: 'success', text1: 'Prescription rejected' });
            fetchPrescriptions(true);
          } catch (err: any) {
            Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to reject' });
          } finally {
            setActionLoadingId(null);
          }
        },
      },
    ]);
  };

  const pending = prescriptions.filter((p) => p.status === 'SENT_TO_PHARMACY' || p.status === 'PENDING').length;
  const dispensedToday = prescriptions.filter((p) => p.status === 'DISPENSED').length;
  const rejected = prescriptions.filter((p) => p.status === 'REJECTED').length;

  const formatDate = (iso?: string) => {
    if (!iso) return '--';
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderPrescription = ({ item }: { item: Prescription }) => {
    const patientName = item.patient?.name ?? item.patientName ?? 'Unknown';
    const doctorName = item.doctor?.name ?? item.doctorName ?? '--';
    const meds = item.items ?? item.medications ?? [];
    const count = item.itemCount ?? meds.length;
    const isExpanded = expandedId === item.id;
    const isActionLoading = actionLoadingId === item.id;

    return (
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(item.id)} activeOpacity={0.7}>
          <View style={styles.cardInfo}>
            <View style={styles.rxRow}>
              <Ionicons name="document-text-outline" size={16} color={colors.primary} />
              <Text style={styles.rxNumber}>{item.rxNumber ?? item.prescriptionNumber ?? `Rx#${item.id.slice(0, 6)}`}</Text>
            </View>
            <Text style={styles.patientName}>{patientName}</Text>
            <Text style={styles.meta}>
              Dr. {doctorName} | {count} item{count !== 1 ? 's' : ''} | {formatDate(item.createdAt)}
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedSection}>
            {meds.length > 0 ? (
              meds.map((med, idx) => (
                <View key={med.id ?? String(idx)} style={styles.medRow}>
                  <View style={styles.medDot} />
                  <View style={styles.medInfo}>
                    <Text style={styles.medDrug}>{med.drugName ?? med.drug?.name ?? '--'}</Text>
                    <Text style={styles.medDetail}>
                      {[med.dose, med.frequency, med.duration].filter(Boolean).join(' | ')}
                      {med.quantity ? ` | Qty: ${med.quantity}` : ''}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noItems}>No medication items</Text>
            )}
          </View>
        )}

        <View style={styles.actions}>
          <Button
            title="Dispense"
            variant="primary"
            size="sm"
            loading={isActionLoading}
            onPress={() => handleDispense(item.id)}
            style={styles.actionBtn}
          />
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => handleReject(item.id)}
            disabled={isActionLoading}
          >
            <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="Dispense" subtitle="Pharmacy prescriptions" />
      <View style={styles.kpiRow}>
        <KpiCard label="Pending" value={pending} color={colors.warning} />
        <KpiCard label="Dispensed" value={dispensedToday} color={colors.success} />
        <KpiCard label="Rejected" value={rejected} color={colors.danger} />
      </View>
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={prescriptions}
          keyExtractor={(item) => item.id}
          renderItem={renderPrescription}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={prescriptions.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={<EmptyState icon="medkit-outline" title="No pending prescriptions" subtitle="All prescriptions have been processed" />}
        />
      )}
    </View>
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
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  loader: {
    marginTop: 40,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  rxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  rxNumber: {
    ...typography.label,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  patientName: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  meta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  expandedSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  medRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  medDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginRight: spacing.sm,
  },
  medInfo: {
    flex: 1,
  },
  medDrug: {
    ...typography.body,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  medDetail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  noItems: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: borderRadius.base,
    paddingVertical: 10,
    paddingHorizontal: spacing.base,
    gap: 4,
  },
  rejectBtnText: {
    ...typography.label,
    color: colors.danger,
  },
});
