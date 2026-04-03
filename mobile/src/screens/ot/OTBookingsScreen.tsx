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
import { typography, fontSize, fontWeight } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme';
import { Header, KpiCard, StatusBadge, getStatusVariant, EmptyState, Button } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OTBooking {
  id: string;
  procedureName?: string;
  patient?: { id: string; name: string };
  patientName?: string;
  surgeon?: { id: string; name: string };
  surgeonName?: string;
  room?: { id: string; name: string };
  roomName?: string;
  scheduledTime?: string;
  status: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OTBookingsScreen() {
  const [bookings, setBookings] = useState<OTBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBookings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/ot/bookings');
      const list = Array.isArray(data) ? data : data.data ?? data.bookings ?? [];
      setBookings(list);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load OT bookings' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings(true);
  }, [fetchBookings]);

  const handleStart = useCallback(async (id: string) => {
    setActionLoading(id);
    try {
      await api.patch(`/ot/bookings/${id}/start`, {}, { headers: { 'X-Offline': 'true' } });
      Toast.show({ type: 'success', text1: 'Surgery started' });
      fetchBookings(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to start surgery' });
    } finally {
      setActionLoading(null);
    }
  }, [fetchBookings]);

  const handleComplete = useCallback(async (id: string) => {
    setActionLoading(id);
    try {
      await api.patch(`/ot/bookings/${id}/complete`, {}, { headers: { 'X-Offline': 'true' } });
      Toast.show({ type: 'success', text1: 'Surgery completed' });
      fetchBookings(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to complete surgery' });
    } finally {
      setActionLoading(null);
    }
  }, [fetchBookings]);

  /* KPI counts */
  const total = bookings.length;
  const scheduled = bookings.filter((b) => b.status === 'SCHEDULED').length;
  const inProgress = bookings.filter((b) => b.status === 'IN_PROGRESS').length;
  const completed = bookings.filter((b) => b.status === 'COMPLETED').length;

  const formatTime = (iso?: string) => {
    if (!iso) return '--';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '--';
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderBooking = ({ item }: { item: OTBooking }) => {
    const patientName = item.patient?.name ?? item.patientName ?? 'Unknown';
    const surgeonName = item.surgeon?.name ?? item.surgeonName ?? 'Unknown';
    const roomName = item.room?.name ?? item.roomName ?? '--';
    const isActionLoading = actionLoading === item.id;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.procedureName} numberOfLines={1}>
            {item.procedureName ?? 'Procedure'}
          </Text>
          <StatusBadge label={item.status} variant={getStatusVariant(item.status)} />
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.infoText}>{patientName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="medkit-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.infoText}>Dr. {surgeonName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.infoText}>{roomName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            {formatDate(item.scheduledTime)} at {formatTime(item.scheduledTime)}
          </Text>
        </View>

        {item.status === 'SCHEDULED' && (
          <Button
            title="Start Surgery"
            onPress={() => handleStart(item.id)}
            loading={isActionLoading}
            size="sm"
            style={styles.actionBtn}
          />
        )}
        {item.status === 'IN_PROGRESS' && (
          <Button
            title="Complete Surgery"
            onPress={() => handleComplete(item.id)}
            loading={isActionLoading}
            variant="secondary"
            size="sm"
            style={styles.actionBtn}
          />
        )}
      </View>
      </SafeAreaView>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="OT Bookings" subtitle={`${total} bookings`} />
      <View style={styles.kpiRow}>
        <KpiCard label="Total" value={total} color={colors.text} />
        <KpiCard label="Scheduled" value={scheduled} color={colors.info} />
        <KpiCard label="In Progress" value={inProgress} color={colors.warning} />
        <KpiCard label="Completed" value={completed} color={colors.success} />
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBooking}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={bookings.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <EmptyState icon="cut-outline" title="No OT bookings" subtitle="No surgeries scheduled" />
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
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  procedureName: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  actionBtn: {
    marginTop: spacing.sm,
  },
});
