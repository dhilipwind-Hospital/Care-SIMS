import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import { typography, fontSize, fontWeight } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme';
import { Header, EmptyState } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LowStockItem {
  id: string;
  drugName?: string;
  name?: string;
  currentStock?: number;
  stockQuantity?: number;
  reorderLevel?: number;
}

interface ExpiryItem {
  id: string;
  drugName?: string;
  name?: string;
  batchNumber?: string;
  expiryDate?: string;
  daysRemaining?: number;
}

type AlertItem = (LowStockItem | ExpiryItem) & { _type: 'lowStock' | 'expiry' };

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getExpiryColor(days?: number): string {
  if (days == null) return colors.textSecondary;
  if (days < 7) return colors.danger;
  if (days < 30) return '#F97316'; // orange
  if (days < 90) return colors.warning;
  return colors.textSecondary;
}

function getExpiryBg(days?: number): string {
  if (days == null) return colors.card;
  if (days < 7) return colors.dangerLight;
  if (days < 30) return '#FFF7ED'; // orange-light
  if (days < 90) return colors.warningLight;
  return colors.card;
}

function computeDaysRemaining(expiryDate?: string): number | undefined {
  if (!expiryDate) return undefined;
  const diff = new Date(expiryDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PharmacyAlertsScreen() {
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [expiring, setExpiring] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlerts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [lowRes, expRes] = await Promise.all([
        api.get('/pharmacy/low-stock'),
        api.get('/pharmacy/expiry-alerts'),
      ]);
      const lowList = Array.isArray(lowRes.data) ? lowRes.data : lowRes.data.data ?? [];
      const expList = Array.isArray(expRes.data) ? expRes.data : expRes.data.data ?? [];
      setLowStock(lowList);
      setExpiring(expList);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load alerts' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAlerts(true);
  }, [fetchAlerts]);

  const sections = [
    {
      title: 'Low Stock',
      icon: 'trending-down-outline' as const,
      iconColor: colors.danger,
      data: lowStock.map((item) => ({ ...item, _type: 'lowStock' as const })),
    },
    {
      title: 'Expiring Soon',
      icon: 'time-outline' as const,
      iconColor: colors.warning,
      data: expiring.map((item) => ({ ...item, _type: 'expiry' as const })),
    },
  ];

  const formatDate = (iso?: string) => {
    if (!iso) return '--';
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderItem = ({ item }: { item: AlertItem }) => {
    if (item._type === 'lowStock') {
      const ls = item as LowStockItem & { _type: string };
      const stock = ls.currentStock ?? ls.stockQuantity ?? 0;
      const reorder = ls.reorderLevel ?? 0;
      const pct = reorder > 0 ? Math.min(stock / reorder, 1) : 0;

      return (
        <View style={[styles.card, { borderLeftColor: colors.danger, borderLeftWidth: 3 }]}>
          <View style={styles.cardRow}>
            <View style={styles.cardInfo}>
              <Text style={styles.drugName}>{ls.drugName ?? ls.name ?? 'Unknown'}</Text>
              <Text style={styles.stockDetail}>
                Current: <Text style={styles.stockValueDanger}>{stock}</Text>  |  Reorder Level: {reorder}
              </Text>
            </View>
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: colors.danger }]} />
          </View>
        </View>
      );
    }

    // Expiry item
    const ex = item as ExpiryItem & { _type: string };
    const days = ex.daysRemaining ?? computeDaysRemaining(ex.expiryDate);
    const exColor = getExpiryColor(days);
    const exBg = getExpiryBg(days);

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={[styles.card, { backgroundColor: exBg, borderLeftColor: exColor, borderLeftWidth: 3 }]}>
        <View style={styles.cardRow}>
          <View style={styles.cardInfo}>
            <Text style={styles.drugName}>{ex.drugName ?? ex.name ?? 'Unknown'}</Text>
            {ex.batchNumber && (
              <Text style={styles.batchText}>Batch: {ex.batchNumber}</Text>
            )}
            <Text style={styles.expiryDate}>Expires: {formatDate(ex.expiryDate)}</Text>
          </View>
          <View style={styles.daysWrap}>
            <Text style={[styles.daysNumber, { color: exColor }]}>
              {days != null ? days : '--'}
            </Text>
            <Text style={[styles.daysLabel, { color: exColor }]}>days</Text>
          </View>
        </View>
      </View>
      </SafeAreaView>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string; icon: string; iconColor: string; data: any[] } }) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={section.icon as any} size={18} color={section.iconColor} />
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionBadge}>
        <Text style={styles.sectionCount}>{section.data.length}</Text>
      </View>
    </View>
  );

  const totalAlerts = lowStock.length + expiring.length;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="Alerts" subtitle={`${totalAlerts} alert${totalAlerts !== 1 ? 's' : ''}`} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id + item._type}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={totalAlerts === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={<EmptyState icon="checkmark-circle-outline" title="No alerts" subtitle="Stock levels and expiry dates are within range" />}
        stickySectionHeadersEnabled={false}
      />
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: colors.primaryLight + '20',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  sectionCount: {
    ...typography.label,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  drugName: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  stockDetail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stockValueDanger: {
    fontWeight: fontWeight.bold,
    color: colors.danger,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  batchText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  expiryDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  daysWrap: {
    alignItems: 'center',
  },
  daysNumber: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  daysLabel: {
    ...typography.caption,
    fontWeight: fontWeight.medium,
  },
});
