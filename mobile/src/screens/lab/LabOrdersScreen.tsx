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
import { useNavigation } from '@react-navigation/native';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import { typography, fontSize, fontWeight } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme';
import { Header, KpiCard, StatusBadge, getStatusVariant, EmptyState } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LabOrder {
  id: string;
  orderNumber?: string;
  patient?: { id: string; name: string };
  patientName?: string;
  testCount?: number;
  tests?: any[];
  priority?: string;
  status: string;
  createdAt?: string;
}

const STATUS_FILTERS = ['ALL', 'ORDERED', 'SAMPLE_COLLECTED', 'IN_PROGRESS', 'RESULTED', 'VALIDATED'] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LabOrdersScreen() {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/lab/orders', { params: { page: 1, limit: 20 } });
      const list = Array.isArray(data) ? data : data.data ?? data.orders ?? [];
      setOrders(list);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load lab orders' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(true);
  }, [fetchOrders]);

  const filtered = activeFilter === 'ALL'
    ? orders
    : orders.filter((o) => o.status === activeFilter);

  const total = orders.length;
  const pending = orders.filter((o) => o.status === 'ORDERED').length;
  const inProgress = orders.filter((o) => o.status === 'IN_PROGRESS' || o.status === 'SAMPLE_COLLECTED').length;
  const completed = orders.filter((o) => o.status === 'RESULTED' || o.status === 'VALIDATED').length;

  const formatDate = (iso?: string) => {
    if (!iso) return '--';
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getPriorityVariant = (priority?: string) => {
    switch (priority?.toUpperCase()) {
      case 'URGENT':
      case 'STAT':
        return 'danger';
      case 'HIGH':
        return 'warning';
      default:
        return 'info';
    }
  };

  const renderFilterChips = () => (
    <View style={styles.chipRow}>
      {STATUS_FILTERS.map((filter) => {
        const isActive = activeFilter === filter;
        return (
          <TouchableOpacity
            key={filter}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {filter.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderOrder = ({ item }: { item: LabOrder }) => {
    const patientName = item.patient?.name ?? item.patientName ?? 'Unknown';
    const testCount = item.testCount ?? item.tests?.length ?? 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('LabOrderDetail', { orderId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.orderNumWrap}>
            <Ionicons name="flask-outline" size={18} color={colors.primary} />
            <Text style={styles.orderNum}>{item.orderNumber ?? `#${item.id.slice(0, 6)}`}</Text>
          </View>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={styles.patientName}>{patientName}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.testCount}>{testCount} test{testCount !== 1 ? 's' : ''}</Text>
          <View style={styles.badges}>
            {item.priority && item.priority !== 'NORMAL' && (
              <StatusBadge label={item.priority} variant={getPriorityVariant(item.priority)} />
            )}
            <StatusBadge label={item.status.replace(/_/g, ' ')} variant={getStatusVariant(item.status)} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="Lab Orders" subtitle={`${total} orders`} />
      <View style={styles.kpiRow}>
        <KpiCard label="Total" value={total} color={colors.info} />
        <KpiCard label="Pending" value={pending} color={colors.warning} />
        <KpiCard label="In Progress" value={inProgress} color={colors.purple} />
        <KpiCard label="Completed" value={completed} color={colors.success} />
      </View>
      {renderFilterChips()}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={<EmptyState icon="flask-outline" title="No lab orders" subtitle="No orders match the selected filter" />}
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.borderLight,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    ...typography.caption,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  chipTextActive: {
    color: colors.white,
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
    alignItems: 'center',
    marginBottom: 4,
  },
  orderNumWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderNum: {
    ...typography.label,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  date: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  patientName: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testCount: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
});
