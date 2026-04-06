import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
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
import { Header, EmptyState } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Batch {
  id?: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity?: number;
}

interface Drug {
  id: string;
  name?: string;
  drugName?: string;
  genericName?: string;
  category?: string;
  stockQuantity?: number;
  quantity?: number;
  price?: number;
  reorderLevel?: number;
  batches?: Batch[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PharmacyInventoryScreen() {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDrugs = useCallback(async (query = '', silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params: any = { page: 1, limit: 20 };
      if (query.trim()) params.search = query.trim();
      const { data } = await api.get('/pharmacy/drugs', { params });
      const list = Array.isArray(data) ? data : data.data ?? data.drugs ?? [];
      setDrugs(list);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load inventory' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDrugs();
  }, [fetchDrugs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDrugs(search, true);
  }, [fetchDrugs, search]);

  const onSearchChange = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchDrugs(text, true);
    }, 400);
  };

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '--';
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isLowStock = (drug: Drug) => {
    const stock = drug.stockQuantity ?? drug.quantity ?? 0;
    const reorder = drug.reorderLevel ?? 0;
    return reorder > 0 && stock < reorder;
  };

  const renderDrug = ({ item }: { item: Drug }) => {
    const name = item.name ?? item.drugName ?? 'Unknown';
    const stock = item.stockQuantity ?? item.quantity ?? 0;
    const low = isLowStock(item);
    const isExpanded = expandedId === item.id;
    const batches = item.batches ?? [];

    return (
      <TouchableOpacity
        style={[styles.card, low && styles.cardLow]}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.drugName}>{name}</Text>
            {item.genericName && (
              <Text style={styles.genericName}>{item.genericName}</Text>
            )}
            {item.category && (
              <Text style={styles.category}>{item.category}</Text>
            )}
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.stockQty, low && styles.stockLow]}>
              {stock}
            </Text>
            <Text style={styles.stockLabel}>in stock</Text>
            {item.price != null && (
              <Text style={styles.price}>${item.price.toFixed(2)}</Text>
            )}
          </View>
        </View>

        {low && (
          <View style={styles.lowStockBadge}>
            <Ionicons name="warning" size={12} color={colors.danger} />
            <Text style={styles.lowStockText}>Low Stock</Text>
          </View>
        )}

        {isExpanded && batches.length > 0 && (
          <View style={styles.expandedSection}>
            <Text style={styles.batchTitle}>Batches</Text>
            {batches.map((batch, idx) => (
              <View key={batch.id ?? String(idx)} style={styles.batchRow}>
                <Text style={styles.batchNumber}>{batch.batchNumber ?? `Batch ${idx + 1}`}</Text>
                <Text style={styles.batchDetail}>
                  Qty: {batch.quantity ?? '--'} | Exp: {formatDate(batch.expiryDate)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {isExpanded && batches.length === 0 && (
          <View style={styles.expandedSection}>
            <Text style={styles.noBatches}>No batch details available</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="Inventory" subtitle="Pharmacy stock" />
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search drugs..."
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); fetchDrugs('', true); }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={drugs}
          keyExtractor={(item) => item.id}
          renderItem={renderDrug}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={drugs.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={<EmptyState icon="cube-outline" title="No drugs found" subtitle={search ? 'Try a different search term' : 'Inventory is empty'} />}
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: spacing.base,
    marginVertical: spacing.sm,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: fontSize.base,
    color: colors.text,
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
  cardLow: {
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  genericName: {
    ...typography.bodySmall,
    color: colors.primary,
    marginTop: 2,
  },
  category: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  stockQty: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  stockLow: {
    color: colors.danger,
  },
  stockLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  price: {
    ...typography.label,
    color: colors.success,
    marginTop: 4,
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    backgroundColor: colors.dangerLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  lowStockText: {
    ...typography.caption,
    fontWeight: fontWeight.semibold,
    color: colors.danger,
  },
  expandedSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  batchTitle: {
    ...typography.label,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  batchRow: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  batchNumber: {
    ...typography.bodySmall,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  batchDetail: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  noBatches: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
