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

interface LineItem {
  id?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
}

interface Payment {
  id?: string;
  date?: string;
  amount?: number;
  method?: string;
}

interface Invoice {
  id: string;
  invoiceNumber?: string;
  date?: string;
  createdAt?: string;
  amount?: number;
  totalAmount?: number;
  status: string;
  lineItems?: LineItem[];
  items?: LineItem[];
  payments?: Payment[];
}

export default function PatientBillingScreen() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/auth/patient/me/billing');
      const list = Array.isArray(data) ? data : data.data ?? data.invoices ?? [];
      setInvoices(list);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load billing' });
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

  const formatCurrency = (val?: number) => {
    if (val == null) return '--';
    return `\u20B9${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const renderItem = ({ item }: { item: Invoice }) => {
    const isExpanded = expandedId === item.id;
    const lines = item.lineItems ?? item.items ?? [];
    const payments = item.payments ?? [];
    const total = item.amount ?? item.totalAmount;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.invoiceNumber}>{item.invoiceNumber ?? 'Invoice'}</Text>
            <Text style={styles.meta}>{formatDate(item.date ?? item.createdAt)}</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.amount}>{formatCurrency(total)}</Text>
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
            {/* Line Items */}
            {lines.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Line Items</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableCell, styles.tableHeaderText, { flex: 3 }]}>Description</Text>
                    <Text style={[styles.tableCell, styles.tableHeaderText]}>Qty</Text>
                    <Text style={[styles.tableCell, styles.tableHeaderText]}>Amount</Text>
                  </View>
                  {lines.map((li, i) => (
                    <View key={li.id ?? i} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 3 }]} numberOfLines={1}>
                        {li.description ?? '--'}
                      </Text>
                      <Text style={styles.tableCell}>{li.quantity ?? 1}</Text>
                      <Text style={styles.tableCell}>{formatCurrency(li.amount ?? (li.unitPrice ?? 0) * (li.quantity ?? 1))}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Payment History */}
            {payments.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>Payment History</Text>
                {payments.map((p, i) => (
                  <View key={p.id ?? i} style={styles.paymentRow}>
                    <Text style={styles.paymentDate}>{formatDate(p.date)}</Text>
                    <Text style={styles.paymentMethod}>{p.method ?? '--'}</Text>
                    <Text style={styles.paymentAmount}>{formatCurrency(p.amount)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="Billing" />
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={invoices.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={<EmptyState icon="card-outline" title="No invoices" subtitle="Your billing history will appear here" />}
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
  invoiceNumber: {
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
    gap: 4,
  },
  amount: {
    ...typography.h4,
    color: colors.text,
  },
  chevron: {
    marginTop: 4,
  },
  expandedContent: {
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
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
  tableCell: {
    flex: 1,
    ...typography.caption,
    color: colors.text,
    paddingHorizontal: 6,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  paymentDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  paymentMethod: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  paymentAmount: {
    ...typography.body,
    fontWeight: '600',
    color: colors.success,
    flex: 1,
    textAlign: 'right',
  },
});
