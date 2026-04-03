import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography, fontSize, fontWeight } from '../../theme/typography';
import { borderRadius, shadow } from '../../theme';
import { StatusBadge, getStatusVariant, EmptyState, Button, Input, BottomSheet } from '../../components';
import api from '../../lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LineItem {
  id?: string;
  description: string;
  amount: number;
  quantity?: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  patient?: { id: string; name: string };
  patientName?: string;
  totalAmount: number;
  paidAmount?: number;
  status: string;
  lineItems?: LineItem[];
  items?: LineItem[];
  createdAt: string;
}

const PAYMENT_METHODS = ['CASH', 'CARD', 'UPI', 'INSURANCE'] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function BillingScreen() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Payment modal
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<typeof PAYMENT_METHODS[number]>('CASH');
  const [submitting, setSubmitting] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      const { data } = await api.get('/billing/invoices', { params: { page: 1, limit: 20 } });
      const list = Array.isArray(data) ? data : data.data ?? data.items ?? [];
      setInvoices(list);
    } catch {
      setError('Failed to load invoices');
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
    fetchInvoices();
  }, [fetchInvoices]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const openPayment = (invoice: Invoice) => {
    const remaining = invoice.totalAmount - (invoice.paidAmount ?? 0);
    setPayingInvoice(invoice);
    setPayAmount(remaining > 0 ? String(remaining) : String(invoice.totalAmount));
    setPayMethod('CASH');
  };

  const handlePayment = async () => {
    if (!payingInvoice) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Validation', 'Please enter a valid amount');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/billing/invoices/${payingInvoice.id}/payments`, {
        amount,
        method: payMethod,
      });
      setPayingInvoice(null);
      fetchInvoices();
      Alert.alert('Success', 'Payment recorded');
    } catch {
      Alert.alert('Error', 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (n: number) => {
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderItem = ({ item }: { item: Invoice }) => {
    const name = item.patient?.name ?? item.patientName ?? 'Unknown';
    const isExpanded = expandedId === item.id;
    const isFinalized = item.status?.toUpperCase() === 'FINALIZED';
    const lineItems = item.lineItems ?? item.items ?? [];

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={[styles.card, shadow.sm]}>
        <TouchableOpacity style={styles.cardTop} onPress={() => toggleExpand(item.id)} activeOpacity={0.7}>
          <View style={styles.cardInfo}>
            <Text style={styles.invoiceNum}>{item.invoiceNumber}</Text>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={styles.amount}>{formatCurrency(item.totalAmount)}</Text>
            <StatusBadge label={item.status} variant={getStatusVariant(item.status)} />
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textTertiary}
              style={{ marginTop: 4 }}
            />
          </View>
        </TouchableOpacity>

        {/* Expanded details */}
        {isExpanded && (
          <View style={styles.expandedSection}>
            {lineItems.length > 0 && (
              <View style={styles.lineItems}>
                {lineItems.map((li, idx) => (
                  <View key={li.id ?? String(idx)} style={styles.lineItem}>
                    <Text style={styles.lineDesc} numberOfLines={1}>
                      {li.description}
                      {li.quantity && li.quantity > 1 ? ` x${li.quantity}` : ''}
                    </Text>
                    <Text style={styles.lineAmount}>{formatCurrency(li.amount)}</Text>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalAmount}>{formatCurrency(item.totalAmount)}</Text>
                </View>
                {(item.paidAmount ?? 0) > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Paid</Text>
                    <Text style={[styles.totalAmount, { color: colors.success }]}>
                      {formatCurrency(item.paidAmount ?? 0)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {isFinalized && (
              <Button
                title="Record Payment"
                variant="primary"
                size="sm"
                onPress={() => openPayment(item)}
                style={{ marginTop: 10 }}
              />
            )}
          </View>
        )}
      </View>
      </SafeAreaView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
      </SafeAreaView>
    );
  }

  if (error && !loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 12 }}>{error}</Text>
          <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' }}>Pull down to retry or check your connection</Text>
          <TouchableOpacity onPress={() => { setError(null); setLoading(true); fetchInvoices(); }} style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#0F766E', borderRadius: 8 }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={invoices.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState icon="receipt-outline" title="No invoices" subtitle="Invoices will appear here" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />

      {/* Payment Modal */}
      <BottomSheet
        visible={!!payingInvoice}
        onClose={() => setPayingInvoice(null)}
        title={`Pay ${payingInvoice?.invoiceNumber ?? ''}`}
      >
        <Input
          label="Amount (₹)"
          placeholder="0.00"
          value={payAmount}
          onChangeText={setPayAmount}
          keyboardType="decimal-pad"
          style={styles.payAmountInput}
        />

        <Text style={styles.formLabel}>Payment Method</Text>
        <View style={styles.methodRow}>
          {PAYMENT_METHODS.map((m) => {
            const active = payMethod === m;
            return (
              <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
                <TouchableOpacity
                key={m}
                style={[styles.methodChip, active && styles.methodChipActive]}
                onPress={() => setPayMethod(m)}
              >
                <Text style={[styles.methodText, active && styles.methodTextActive]}>{m}</Text>
              </TouchableOpacity>
              </SafeAreaView>
            );
          })}
        </View>

        <Button title="Record Payment" onPress={handlePayment} loading={submitting} style={{ marginTop: 8, marginBottom: 16 }} />
      </BottomSheet>
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
  list: {
    padding: 16,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  invoiceNum: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  name: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: 2,
  },
  date: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  amount: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 4,
  },
  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    padding: 14,
  },
  lineItems: {},
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  lineDesc: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  lineAmount: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: 4,
  },
  totalLabel: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  totalAmount: {
    ...typography.body,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  payAmountInput: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  formLabel: {
    ...typography.label,
    color: colors.text,
    marginBottom: 8,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  methodChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.base,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  methodChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  methodText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  methodTextActive: {
    color: colors.white,
  },
});
