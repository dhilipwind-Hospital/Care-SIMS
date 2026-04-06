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

interface LabResult {
  id?: string;
  testName?: string;
  result?: string;
  referenceRange?: string;
  flag?: string;
}

interface LabReport {
  id: string;
  orderNumber?: string;
  date?: string;
  createdAt?: string;
  testCount?: number;
  results?: LabResult[];
  tests?: LabResult[];
  status: string;
}

export default function PatientLabReportsScreen() {
  const [reports, setReports] = useState<LabReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/auth/patient/me/lab-reports');
      const list = Array.isArray(data) ? data : data.data ?? data.reports ?? [];
      setReports(list);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load lab reports' });
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

  const getFlagColor = (flag?: string) => {
    if (!flag) return null;
    const f = flag.toUpperCase();
    if (f === 'CRITICAL' || f === 'HIGH') return colors.danger;
    if (f === 'LOW') return colors.warning;
    if (f === 'NORMAL') return colors.success;
    return colors.textSecondary;
  };

  const renderItem = ({ item }: { item: LabReport }) => {
    const isExpanded = expandedId === item.id;
    const results = item.results ?? item.tests ?? [];
    const count = item.testCount ?? results.length;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.orderNumber}>{item.orderNumber ?? 'Lab Order'}</Text>
            <Text style={styles.meta}>
              {formatDate(item.date ?? item.createdAt)} | {count} test{count !== 1 ? 's' : ''}
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
            {results.length === 0 ? (
              <Text style={styles.noItems}>No results available yet</Text>
            ) : (
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 2 }]}>Test</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderText]}>Result</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderText]}>Ref Range</Text>
                  <Text style={[styles.tableCell, styles.tableHeaderText]}>Flag</Text>
                </View>
                {results.map((r, i) => {
                  const flagColor = getFlagColor(r.flag);
                  const isCritical = r.flag?.toUpperCase() === 'CRITICAL';
                  return (
                    <View
                      key={r.id ?? i}
                      style={[styles.tableRow, isCritical && styles.criticalRow]}
                    >
                      <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
                        {r.testName ?? '--'}
                      </Text>
                      <Text style={styles.tableCell} numberOfLines={1}>{r.result ?? '--'}</Text>
                      <Text style={styles.tableCell} numberOfLines={1}>{r.referenceRange ?? '--'}</Text>
                      <Text style={[styles.tableCell, flagColor ? { color: flagColor, fontWeight: '600' } : null]} numberOfLines={1}>
                        {r.flag ?? '--'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="Lab Reports" />
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={reports.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={<EmptyState icon="flask-outline" title="No lab reports" subtitle="Your lab reports will appear here" />}
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
  orderNumber: {
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
  table: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
    paddingVertical: 6,
  },
  tableHeaderText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  criticalRow: {
    backgroundColor: colors.dangerLight,
  },
  tableCell: {
    flex: 1,
    ...typography.caption,
    color: colors.text,
    paddingHorizontal: 6,
  },
});
