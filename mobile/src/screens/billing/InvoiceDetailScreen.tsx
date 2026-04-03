import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import { typography, fontSize, fontWeight } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme';
import {
  Header,
  StatusBadge,
  getStatusVariant,
  Button,
  BottomSheet,
  Input,
  SectionCard,
} from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LineItem {
  id?: string;
  description?: string;
  category?: string;
  quantity?: number;
  unitPrice?: number;
  discount?: number;
  amount?: number;
}

interface Payment {
  id?: string;
  amount?: number;
  method?: string;
  reference?: string;
  createdAt?: string;
}

interface InvoiceDetail {
  id: string;
  invoiceNumber?: string;
  status: string;
  date?: string;
  createdAt?: string;
  patient?: { id: string; name: string; phone?: string; email?: string };
  lineItems?: LineItem[];
  items?: LineItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  netTotal?: number;
  totalAmount?: number;
  paidAmount?: number;
  balanceDue?: number;
  payments?: Payment[];
}

type RouteParams = { invoiceId: string };

const PAYMENT_METHODS = ['CASH', 'CARD', 'UPI', 'INSURANCE'] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(amount?: number): string {
  if (amount == null) return '\u20B90.00';
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

export default function InvoiceDetailScreen() {
  const route = useRoute<RouteProp<Record<string, RouteParams>, string>>();
  const navigation = useNavigation<any>();
  const { invoiceId } = route.params;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Payment bottom sheet state
  const [showPayment, setShowPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<string>('CASH');
  const [payReference, setPayReference] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const fetchInvoice = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get(`/billing/invoices/${invoiceId}`);
      const result = data.data ?? data;
      setInvoice(result);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load invoice' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvoice(true);
  }, [fetchInvoice]);

  /* --- Actions --- */

  const handleFinalize = useCallback(async () => {
    setActionLoading(true);
    try {
      await api.patch(`/billing/invoices/${invoiceId}/finalize`, {}, { headers: { 'X-Offline': 'true' } });
      Toast.show({ type: 'success', text1: 'Invoice finalized' });
      fetchInvoice(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to finalize' });
    } finally {
      setActionLoading(false);
    }
  }, [invoiceId, fetchInvoice]);

  const handleCancel = useCallback(() => {
    Alert.alert('Cancel Invoice', 'Are you sure you want to cancel this invoice?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await api.patch(`/billing/invoices/${invoiceId}/cancel`, {}, { headers: { 'X-Offline': 'true' } });
            Toast.show({ type: 'success', text1: 'Invoice cancelled' });
            fetchInvoice(true);
          } catch (err: any) {
            Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to cancel' });
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [invoiceId, fetchInvoice]);

  const handleRecordPayment = useCallback(async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      Toast.show({ type: 'error', text1: 'Enter a valid amount' });
      return;
    }
    setPayLoading(true);
    try {
      await api.post(
        `/billing/invoices/${invoiceId}/payments`,
        { amount, method: payMethod, reference: payReference || undefined },
        { headers: { 'X-Offline': 'true' } },
      );
      Toast.show({ type: 'success', text1: 'Payment recorded' });
      setShowPayment(false);
      setPayAmount('');
      setPayReference('');
      fetchInvoice(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to record payment' });
    } finally {
      setPayLoading(false);
    }
  }, [invoiceId, payAmount, payMethod, payReference, fetchInvoice]);

  /* --- Rendering --- */

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.container}>
        <Header title="Invoice" onBack={() => navigation.goBack()} />
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
      </SafeAreaView>
    );
  }

  if (!invoice) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.container}>
        <Header title="Invoice" onBack={() => navigation.goBack()} />
        <Text style={styles.errorText}>Invoice not found</Text>
      </View>
      </SafeAreaView>
    );
  }

  const lineItems = invoice.lineItems ?? invoice.items ?? [];
  const payments = invoice.payments ?? [];
  const subtotal = invoice.subtotal ?? 0;
  const discount = invoice.discount ?? 0;
  const tax = invoice.tax ?? 0;
  const netTotal = invoice.netTotal ?? invoice.totalAmount ?? 0;
  const paidAmount = invoice.paidAmount ?? 0;
  const balanceDue = invoice.balanceDue ?? netTotal - paidAmount;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header
        title={invoice.invoiceNumber ?? 'Invoice'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header section */}
        <View style={styles.headerSection}>
          <View style={styles.headerRow}>
            <Text style={styles.invoiceNum}>{invoice.invoiceNumber ?? `#${invoice.id.slice(0, 8)}`}</Text>
            <StatusBadge label={invoice.status} variant={getStatusVariant(invoice.status)} />
          </View>
          <Text style={styles.headerDate}>{formatDate(invoice.date ?? invoice.createdAt)}</Text>
        </View>

        {/* Patient info */}
        {invoice.patient && (
          <SectionCard title="Patient">
            <Text style={styles.patientName}>{invoice.patient.name}</Text>
            {invoice.patient.phone && (
              <Text style={styles.patientDetail}>{invoice.patient.phone}</Text>
            )}
            {invoice.patient.email && (
              <Text style={styles.patientDetail}>{invoice.patient.email}</Text>
            )}
          </SectionCard>
        )}

        {/* Line items */}
        <SectionCard title="Line Items">
          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.descCol]}>Description</Text>
            <Text style={[styles.tableCell, styles.qtyCol]}>Qty</Text>
            <Text style={[styles.tableCell, styles.priceCol]}>Price</Text>
            <Text style={[styles.tableCell, styles.amountCol]}>Amount</Text>
          </View>
          {lineItems.length === 0 ? (
            <Text style={styles.emptyNote}>No line items</Text>
          ) : (
            lineItems.map((item, idx) => (
              <View key={item.id ?? idx} style={styles.tableRow}>
                <View style={styles.descCol}>
                  <Text style={styles.itemDesc} numberOfLines={2}>
                    {item.description ?? '--'}
                  </Text>
                  {item.category && (
                    <Text style={styles.itemCategory}>{item.category}</Text>
                  )}
                </View>
                <Text style={[styles.tableCell, styles.qtyCol]}>{item.quantity ?? 1}</Text>
                <Text style={[styles.tableCell, styles.priceCol]}>
                  {formatCurrency(item.unitPrice)}
                </Text>
                <Text style={[styles.tableCell, styles.amountCol]}>
                  {formatCurrency(item.amount ?? (item.unitPrice ?? 0) * (item.quantity ?? 1))}
                </Text>
              </View>
            ))
          )}
        </SectionCard>

        {/* Totals */}
        <SectionCard title="Totals">
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={[styles.totalValue, { color: colors.success }]}>-{formatCurrency(discount)}</Text>
            </View>
          )}
          {tax > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>{formatCurrency(tax)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.totalRowBold]}>
            <Text style={styles.totalLabelBold}>Net Total</Text>
            <Text style={styles.totalValueBold}>{formatCurrency(netTotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Paid</Text>
            <Text style={[styles.totalValue, { color: colors.success }]}>{formatCurrency(paidAmount)}</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowBold]}>
            <Text style={styles.totalLabelBold}>Balance Due</Text>
            <Text style={[styles.totalValueBold, balanceDue > 0 ? { color: colors.danger } : { color: colors.success }]}>
              {formatCurrency(balanceDue)}
            </Text>
          </View>
        </SectionCard>

        {/* Payment history */}
        {payments.length > 0 && (
          <SectionCard title="Payment History">
            {payments.map((p, idx) => (
              <View key={p.id ?? idx} style={styles.paymentRow}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentMethod}>{p.method ?? 'CASH'}</Text>
                  {p.reference && <Text style={styles.paymentRef}>Ref: {p.reference}</Text>}
                  <Text style={styles.paymentDate}>{formatDate(p.createdAt)}</Text>
                </View>
                <Text style={styles.paymentAmount}>{formatCurrency(p.amount)}</Text>
              </View>
            ))}
          </SectionCard>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {invoice.status === 'DRAFT' && (
            <>
              <Button
                title="Finalize Invoice"
                onPress={handleFinalize}
                loading={actionLoading}
                style={styles.actionBtn}
              />
              <Button
                title="Cancel Invoice"
                onPress={handleCancel}
                variant="danger"
                loading={actionLoading}
                style={styles.actionBtn}
              />
            </>
          )}
          {invoice.status === 'FINALIZED' && (
            <Button
              title="Record Payment"
              onPress={() => setShowPayment(true)}
              style={styles.actionBtn}
            />
          )}
        </View>
      </ScrollView>

      {/* Payment Bottom Sheet */}
      <BottomSheet
        visible={showPayment}
        onClose={() => setShowPayment(false)}
        title="Record Payment"
      >
        <Input
          label="Amount"
          placeholder="Enter amount"
          value={payAmount}
          onChangeText={setPayAmount}
          keyboardType="decimal-pad"
        />

        <Text style={styles.methodLabel}>Payment Method</Text>
        <View style={styles.methodRow}>
          {PAYMENT_METHODS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.methodChip, payMethod === m && styles.methodChipActive]}
              onPress={() => setPayMethod(m)}
            >
              <Text style={[styles.methodChipText, payMethod === m && styles.methodChipTextActive]}>
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Reference (optional)"
          placeholder="Transaction ID / Reference"
          value={payReference}
          onChangeText={setPayReference}
        />

        <Button
          title="Submit Payment"
          onPress={handleRecordPayment}
          loading={payLoading}
          style={{ marginTop: spacing.sm }}
        />
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
  loader: {
    marginTop: 40,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['2xl'],
  },
  /* Header section */
  headerSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  invoiceNum: {
    ...typography.h4,
    color: colors.primary,
  },
  headerDate: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  /* Patient */
  patientName: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  patientDetail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  /* Table */
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    alignItems: 'flex-start',
  },
  tableCell: {
    ...typography.bodySmall,
    color: colors.text,
    textAlign: 'right',
  },
  descCol: {
    flex: 3,
    textAlign: 'left',
  },
  qtyCol: {
    flex: 1,
  },
  priceCol: {
    flex: 2,
  },
  amountCol: {
    flex: 2,
  },
  itemDesc: {
    ...typography.bodySmall,
    color: colors.text,
  },
  itemCategory: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 1,
  },
  emptyNote: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  /* Totals */
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalRowBold: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
    paddingTop: spacing.xs,
  },
  totalLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  totalValue: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  totalLabelBold: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  totalValueBold: {
    ...typography.body,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  /* Payments */
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentMethod: {
    ...typography.bodySmall,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  paymentRef: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  paymentDate: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 1,
  },
  paymentAmount: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  /* Actions */
  actions: {
    marginTop: spacing.base,
    gap: spacing.sm,
  },
  actionBtn: {
    marginBottom: 0,
  },
  /* Payment bottom sheet */
  methodLabel: {
    ...typography.label,
    color: colors.text,
    marginBottom: 6,
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.base,
  },
  methodChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.borderLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  methodChipActive: {
    backgroundColor: colors.primaryLight + '20',
    borderColor: colors.primary,
  },
  methodChipText: {
    ...typography.bodySmall,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  methodChipTextActive: {
    color: colors.primary,
  },
});
