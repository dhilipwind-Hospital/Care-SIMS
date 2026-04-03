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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import { typography, fontSize, fontWeight } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme';
import { Header, StatusBadge, getStatusVariant, EmptyState, Button } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ResultDetail {
  id: string;
  testName?: string;
  name?: string;
  resultValue?: string;
  value?: string;
  unit?: string;
  referenceRange?: string;
  flag?: string;
}

interface LabResult {
  id: string;
  orderNumber?: string;
  patient?: { name: string };
  patientName?: string;
  testCount?: number;
  tests?: ResultDetail[];
  results?: ResultDetail[];
  status: string;
  createdAt?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LabResultsScreen() {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const fetchResults = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/lab/results');
      const list = Array.isArray(data) ? data : data.data ?? data.results ?? [];
      setResults(list);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load results' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchResults(true);
  }, [fetchResults]);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleValidate = async (resultId: string) => {
    setValidatingId(resultId);
    try {
      await api.post(`/lab/results/${resultId}/validate`);
      Toast.show({ type: 'success', text1: 'Result validated successfully' });
      fetchResults(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to validate' });
    } finally {
      setValidatingId(null);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '--';
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getFlagColor = (flag?: string) => {
    if (!flag) return colors.textSecondary;
    const f = flag.toUpperCase();
    if (f.includes('CRITICAL')) return colors.danger;
    if (f === 'HIGH') return colors.warning;
    if (f === 'LOW') return colors.info;
    return colors.success;
  };

  const renderResultItem = ({ item }: { item: LabResult }) => {
    const patientName = item.patient?.name ?? item.patientName ?? 'Unknown';
    const details = item.tests ?? item.results ?? [];
    const isExpanded = expandedId === item.id;
    const isReported = item.status === 'REPORTED' || item.status === 'RESULTED';

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.card}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(item.id)} activeOpacity={0.7}>
          <View style={styles.cardInfo}>
            <Text style={styles.orderNum}>{item.orderNumber ?? `#${item.id.slice(0, 6)}`}</Text>
            <Text style={styles.patientName}>{patientName}</Text>
            <Text style={styles.meta}>
              {item.testCount ?? details.length} test{(item.testCount ?? details.length) !== 1 ? 's' : ''} | {formatDate(item.createdAt)}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <StatusBadge label={item.status.replace(/_/g, ' ')} variant={getStatusVariant(item.status)} />
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
              style={{ marginTop: 4 }}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.expandedSection}>
            {details.length > 0 ? (
              details.map((detail, idx) => (
                <View key={detail.id ?? String(idx)} style={styles.detailRow}>
                  <Text style={styles.detailTest}>{detail.testName ?? detail.name ?? '--'}</Text>
                  <View style={styles.detailValues}>
                    <Text style={[styles.detailValue, { color: getFlagColor(detail.flag) }]}>
                      {detail.resultValue ?? detail.value ?? '--'}
                    </Text>
                    {detail.unit && <Text style={styles.detailUnit}> {detail.unit}</Text>}
                  </View>
                  {detail.referenceRange && (
                    <Text style={styles.detailRange}>Ref: {detail.referenceRange}</Text>
                  )}
                  {detail.flag && detail.flag !== 'Normal' && (
                    <Text style={[styles.detailFlag, { color: getFlagColor(detail.flag) }]}>
                      {detail.flag}
                    </Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.noDetails}>No result details available</Text>
            )}

            {isReported && (
              <Button
                title="Validate"
                variant="primary"
                size="sm"
                loading={validatingId === item.id}
                onPress={() => handleValidate(item.id)}
                style={styles.validateBtn}
              />
            )}
          </View>
        )}

        {!isExpanded && isReported && (
          <Button
            title="Validate"
            variant="primary"
            size="sm"
            loading={validatingId === item.id}
            onPress={() => handleValidate(item.id)}
            style={styles.validateBtnCompact}
          />
        )}
      </View>
      </SafeAreaView>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="Lab Results" subtitle="Review & validate" />
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderResultItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={results.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={<EmptyState icon="document-text-outline" title="No results" subtitle="No lab results to review" />}
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
  },
  cardInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  orderNum: {
    ...typography.label,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  patientName: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: 2,
  },
  meta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  expandedSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  detailRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  detailTest: {
    ...typography.bodySmall,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  detailValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  detailUnit: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  detailRange: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  detailFlag: {
    ...typography.caption,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
  },
  noDetails: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  validateBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-end',
  },
  validateBtnCompact: {
    marginTop: spacing.sm,
    alignSelf: 'flex-end',
  },
});
