import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import { typography, fontSize, fontWeight } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme';
import { Header, KpiCard, StatusBadge, getStatusVariant, EmptyState, Button } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PharmacyReturn {
  id: string;
  returnNumber?: string;
  drugName?: string;
  drug?: { name: string };
  quantity?: number;
  reason?: string;
  status: string;
  createdAt?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PharmacyReturnsScreen() {
  const [returns, setReturns] = useState<PharmacyReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalAction, setModalAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [modalReturnId, setModalReturnId] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');

  const fetchReturns = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/pharmacy/returns');
      const list = Array.isArray(data) ? data : data.data ?? data.returns ?? [];
      setReturns(list);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load returns' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReturns(true);
  }, [fetchReturns]);

  const openModal = (returnId: string, action: 'APPROVED' | 'REJECTED') => {
    setModalReturnId(returnId);
    setModalAction(action);
    setCreditAmount('');
    setReviewNotes('');
    setModalVisible(true);
  };

  const handleSubmitReview = async () => {
    if (!modalReturnId) return;

    if (modalAction === 'APPROVED' && !creditAmount.trim()) {
      Alert.alert('Validation', 'Please enter a credit amount.');
      return;
    }

    setActionLoadingId(modalReturnId);
    setModalVisible(false);

    try {
      const body: any = {
        status: modalAction,
        reviewNotes: reviewNotes.trim() || undefined,
      };
      if (modalAction === 'APPROVED') {
        body.creditAmount = parseFloat(creditAmount);
      }

      await api.patch(`/pharmacy/returns/${modalReturnId}/review`, body);
      Toast.show({ type: 'success', text1: `Return ${modalAction.toLowerCase()}` });
      fetchReturns(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to review return' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const total = returns.length;
  const pending = returns.filter((r) => r.status === 'PENDING_REVIEW' || r.status === 'PENDING').length;
  const approved = returns.filter((r) => r.status === 'APPROVED').length;
  const rejected = returns.filter((r) => r.status === 'REJECTED').length;

  const formatDate = (iso?: string) => {
    if (!iso) return '--';
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderReturn = ({ item }: { item: PharmacyReturn }) => {
    const drugName = item.drugName ?? item.drug?.name ?? 'Unknown';
    const isPending = item.status === 'PENDING_REVIEW' || item.status === 'PENDING';
    const isActionLoading = actionLoadingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.returnNum}>
              {item.returnNumber ?? `RET#${item.id.slice(0, 6)}`}
            </Text>
            <Text style={styles.drugName}>{drugName}</Text>
            <Text style={styles.meta}>
              Qty: {item.quantity ?? '--'} | {formatDate(item.createdAt)}
            </Text>
            {item.reason && (
              <Text style={styles.reason} numberOfLines={2}>
                Reason: {item.reason}
              </Text>
            )}
          </View>
          <StatusBadge label={item.status.replace(/_/g, ' ')} variant={getStatusVariant(item.status)} />
        </View>

        {isPending && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => openModal(item.id, 'APPROVED')}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
                  <Text style={styles.approveBtnText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => openModal(item.id, 'REJECTED')}
              disabled={isActionLoading}
            >
              <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="Returns" subtitle="Pharmacy returns" />
      <View style={styles.kpiRow}>
        <KpiCard label="Total" value={total} color={colors.info} />
        <KpiCard label="Pending" value={pending} color={colors.warning} />
        <KpiCard label="Approved" value={approved} color={colors.success} />
        <KpiCard label="Rejected" value={rejected} color={colors.danger} />
      </View>
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={returns}
          keyExtractor={(item) => item.id}
          renderItem={renderReturn}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={returns.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={<EmptyState icon="return-down-back-outline" title="No returns" subtitle="No pharmacy returns to review" />}
        />
      )}

      {/* Review Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalAction === 'APPROVED' ? 'Approve Return' : 'Reject Return'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {modalAction === 'APPROVED' && (
              <>
                <Text style={styles.fieldLabel}>Credit Amount</Text>
                <TextInput
                  style={styles.input}
                  value={creditAmount}
                  onChangeText={setCreditAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </>
            )}

            <Text style={styles.fieldLabel}>Review Notes</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={reviewNotes}
              onChangeText={setReviewNotes}
              placeholder="Enter notes..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Button
                title={modalAction === 'APPROVED' ? 'Approve' : 'Reject'}
                variant={modalAction === 'APPROVED' ? 'primary' : 'danger'}
                onPress={handleSubmitReview}
                style={styles.modalSubmitBtn}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  returnNum: {
    ...typography.label,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  drugName: {
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
  reason: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.base,
    paddingVertical: 10,
    gap: 6,
  },
  approveBtnText: {
    ...typography.label,
    color: colors.white,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: borderRadius.base,
    paddingVertical: 10,
    paddingHorizontal: spacing.base,
    gap: 4,
  },
  rejectBtnText: {
    ...typography.label,
    color: colors.danger,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadow.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  modalTitle: {
    ...typography.h4,
    color: colors.text,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.base,
    color: colors.text,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: spacing.base,
    justifyContent: 'center',
  },
  modalCancelText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  modalSubmitBtn: {
    minWidth: 100,
  },
});
