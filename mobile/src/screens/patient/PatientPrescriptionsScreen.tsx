import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme';
import { Header, StatusBadge, getStatusVariant, EmptyState } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

interface MedItem {
  id?: string;
  drugName?: string;
  drug?: string;
  dose?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

interface Prescription {
  id: string;
  doctorName?: string;
  doctor?: { name: string };
  date?: string;
  createdAt?: string;
  items?: MedItem[];
  medications?: MedItem[];
  status: string;
}

export default function PatientPrescriptionsScreen() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/auth/patient/me/prescriptions');
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
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  const formatDate = (d?: string) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderItem = ({ item }: { item: Prescription }) => {
    const isExpanded = expandedId === item.id;
    const meds = item.items ?? item.medications ?? [];

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.doctorName}>{item.doctorName ?? item.doctor?.name ?? 'Unknown'}</Text>
            <Text style={styles.meta}>
              {formatDate(item.date ?? item.createdAt)} | {meds.length} item{meds.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <StatusBadge label={item.status} variant={getStatusVariant(item.status)} />
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textTertiary}
              style={styles.chevron}
            />
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {meds.length === 0 ? (
              <Text style={styles.noItems}>No medications listed</Text>
            ) : (
              <View style={styles.medTable}>
                <View style={styles.medTableHeader}>
                  <Text style={[styles.medTableCell, styles.medTableHeaderText, { flex: 2 }]}>Drug</Text>
                  <Text style={[styles.medTableCell, styles.medTableHeaderText]}>Dose</Text>
                  <Text style={[styles.medTableCell, styles.medTableHeaderText]}>Freq</Text>
                  <Text style={[styles.medTableCell, styles.medTableHeaderText]}>Duration</Text>
                </View>
                {meds.map((med, i) => (
                  <View key={med.id ?? i} style={styles.medTableRow}>
                    <Text style={[styles.medTableCell, { flex: 2 }]} numberOfLines={1}>
                      {med.drugName ?? med.drug ?? '--'}
                    </Text>
                    <Text style={styles.medTableCell} numberOfLines={1}>{med.dose ?? med.dosage ?? '--'}</Text>
                    <Text style={styles.medTableCell} numberOfLines={1}>{med.frequency ?? '--'}</Text>
                    <Text style={styles.medTableCell} numberOfLines={1}>{med.duration ?? '--'}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
      </SafeAreaView>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="My Prescriptions" />
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={prescriptions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={prescriptions.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={<EmptyState icon="document-text-outline" title="No prescriptions" subtitle="Your prescriptions will appear here" />}
        />
      )}
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
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
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
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
  },
  doctorName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  chevron: {
    marginTop: 6,
  },
  expandedContent: {
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  noItems: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  medTable: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  medTableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
    paddingVertical: 6,
  },
  medTableHeaderText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  medTableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  medTableCell: {
    flex: 1,
    ...typography.caption,
    color: colors.text,
    paddingHorizontal: 6,
  },
});
