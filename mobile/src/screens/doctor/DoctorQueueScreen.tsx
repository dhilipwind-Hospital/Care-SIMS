import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme';
import { Header, KpiCard, StatusBadge, getStatusVariant, EmptyState, Button } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

interface QueueToken {
  id: string;
  tokenNumber: number;
  status: string;
  priority?: string;
  patient?: {
    id: string;
    name: string;
    age?: number;
    gender?: string;
  };
  waitTime?: number;
  createdAt?: string;
}

const AUTO_REFRESH_MS = 30000;

export default function DoctorQueueScreen() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQueue = useCallback(async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get(`/queue/doctor/${user.id}`);
      // Handle multiple response shapes: array | { data: [...] } | { tokens: [...] } | { data: { tokens: [...] } }
      let list: any[] = [];
      if (Array.isArray(data)) list = data;
      else if (Array.isArray(data?.data)) list = data.data;
      else if (Array.isArray(data?.tokens)) list = data.tokens;
      else if (Array.isArray(data?.data?.tokens)) list = data.data.tokens;
      setTokens(list);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load queue' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchQueue();
    intervalRef.current = setInterval(() => fetchQueue(true), AUTO_REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchQueue]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchQueue(true);
  }, [fetchQueue]);

  const startConsult = async (tokenId: string) => {
    setActionLoading(tokenId);
    try {
      await api.patch(`/queue/${tokenId}/status`, { status: 'IN_PROGRESS' });
      Toast.show({ type: 'success', text1: 'Consultation started' });
      fetchQueue(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to start consult' });
    } finally {
      setActionLoading(null);
    }
  };

  const markNoShow = async (tokenId: string) => {
    Alert.alert('No Show', 'Mark this patient as no show?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(tokenId);
          try {
            await api.patch(`/queue/${tokenId}/no-show`);
            Toast.show({ type: 'success', text1: 'Marked as no show' });
            fetchQueue(true);
          } catch (err: any) {
            Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to update' });
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const waiting = tokens.filter((t) => t.status === 'WAITING').length;
  const inConsult = tokens.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'IN_CONSULT').length;
  const completed = tokens.filter((t) => t.status === 'COMPLETED').length;

  const formatWait = (mins?: number) => {
    if (!mins && mins !== 0) return '--';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const renderToken = ({ item }: { item: QueueToken }) => {
    const isWaiting = item.status === 'WAITING';
    const isActionLoading = actionLoading === item.id;

    return (
      <View style={styles.tokenCard}>
        <View style={styles.tokenHeader}>
          <View style={styles.tokenNumberWrap}>
            <Text style={styles.tokenNumber}>#{item.tokenNumber}</Text>
          </View>
          <View style={styles.tokenInfo}>
            <Text style={styles.patientName}>{item.patient?.name ?? 'Unknown'}</Text>
            <Text style={styles.tokenMeta}>
              Wait: {formatWait(item.waitTime)}
              {item.patient?.age ? ` | ${item.patient.age} yrs` : ''}
            </Text>
          </View>
          <View style={styles.tokenRight}>
            {item.priority && item.priority !== 'NORMAL' && (
              <StatusBadge label={item.priority} variant="danger" />
            )}
            <StatusBadge label={item.status} variant={getStatusVariant(item.status)} />
          </View>
        </View>
        {isWaiting && (
          <View style={styles.tokenActions}>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => startConsult(item.id)}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="play-circle-outline" size={16} color={colors.white} />
                  <Text style={styles.startBtnText}>Start Consult</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.noShowBtn}
              onPress={() => markNoShow(item.id)}
              disabled={isActionLoading}
            >
              <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.noShowBtnText}>No Show</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="My Queue" subtitle={`${tokens.length} patients today`} />
      <View style={styles.kpiRow}>
        <KpiCard label="Waiting" value={waiting} color={colors.warning} />
        <KpiCard label="In Consult" value={inConsult} color={colors.info} />
        <KpiCard label="Completed" value={completed} color={colors.success} />
      </View>
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={tokens}
          keyExtractor={(item) => item.id}
          renderItem={renderToken}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={tokens.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No patients in queue" subtitle="Your queue is empty right now" />}
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
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
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
  tokenCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenNumberWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  tokenNumber: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
  },
  tokenInfo: {
    flex: 1,
  },
  patientName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  tokenMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tokenRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  tokenActions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  startBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.base,
    paddingVertical: 10,
    gap: 6,
  },
  startBtnText: {
    ...typography.label,
    color: colors.white,
  },
  noShowBtn: {
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
  noShowBtnText: {
    ...typography.label,
    color: colors.danger,
  },
});
