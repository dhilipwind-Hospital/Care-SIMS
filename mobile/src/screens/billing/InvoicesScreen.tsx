import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Header, StatusBadge, getStatusVariant, EmptyState, Input } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Invoice {
  id: string;
  invoiceNumber?: string;
  patient?: { id: string; name: string };
  patientName?: string;
  date?: string;
  createdAt?: string;
  totalAmount?: number;
  netTotal?: number;
  status: string;
}

const STATUS_FILTERS = ['ALL', 'DRAFT', 'FINALIZED', 'PAID', 'CANCELLED'] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(amount?: number): string {
  if (amount == null) return '\u20B90';
  return `\u20B9${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso?: string): string {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function InvoicesScreen() {
  const navigation = useNavigation<any>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchInvoices = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/billing/invoices', { params: { page: 1, limit: 20 } });
      const list = Array.isArray(data) ? data : data.data ?? data.invoices ?? [];
      setInvoices(list);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load invoices' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvoices(true);
  }, [fetchInvoices]);

  // Debounced search
  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Search is applied client-side on already fetched data
    }, 300);
  }, []);

  // Filtered list
  const filtered = invoices.filter((inv) => {
    const matchesFilter = activeFilter === 'ALL' || inv.status === activeFilter;
    if (!matchesFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = (inv.patient?.name ?? inv.patientName ?? '').toLowerCase();
    const num = (inv.invoiceNumber ?? '').toLowerCase();
    return name.includes(q) || num.includes(q);
  });

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
              {filter}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderInvoice = ({ item }: { item: Invoice }) => {
    const patientName = item.patient?.name ?? item.patientName ?? 'Unknown';
    const amount = item.totalAmount ?? item.netTotal ?? 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.invoiceNumWrap}>
            <Ionicons name="receipt-outline" size={18} color={colors.primary} />
            <Text style={styles.invoiceNum}>{item.invoiceNumber ?? `#${item.id.slice(0, 6)}`}</Text>
          </View>
          <Text style={styles.date}>{formatDate(item.date ?? item.createdAt)}</Text>
        </View>
        <Text style={styles.patientName}>{patientName}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.amount}>{formatCurrency(amount)}</Text>
          <StatusBadge label={item.status} variant={getStatusVariant(item.status)} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="Invoices" subtitle={`${filtered.length} invoices`} />

      <View style={styles.searchWrap}>
        <Input
          placeholder="Search by patient or invoice #"
          value={search}
          onChangeText={handleSearchChange}
          leftIcon={<Ionicons name="search-outline" size={18} color={colors.textSecondary} />}
          containerStyle={styles.searchInput}
        />
      </View>

      {renderFilterChips()}

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderInvoice}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <EmptyState icon="receipt-outline" title="No invoices" subtitle="No invoices match your search" />
          }
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
  searchWrap: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  searchInput: {
    marginBottom: spacing.sm,
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
  invoiceNumWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  invoiceNum: {
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
  amount: {
    ...typography.body,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
});
