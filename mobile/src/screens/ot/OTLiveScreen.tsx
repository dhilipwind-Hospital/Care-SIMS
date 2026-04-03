import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
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
import { Header, Button, EmptyState } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OTRoom {
  id: string;
  name?: string;
  roomNumber?: string;
  status: 'FREE' | 'IN_USE' | 'MAINTENANCE' | string;
  currentBooking?: {
    id: string;
    procedureName?: string;
    surgeon?: { name: string };
    surgeonName?: string;
    startTime?: string;
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  FREE: { bg: colors.successLight, text: colors.success, label: 'Free' },
  IN_USE: { bg: colors.dangerLight, text: colors.danger, label: 'In Use' },
  MAINTENANCE: { bg: colors.warningLight, text: colors.warning, label: 'Maintenance' },
};

function formatElapsed(startIso?: string): string {
  if (!startIso) return '--:--';
  const diff = Math.max(0, Date.now() - new Date(startIso).getTime());
  const hrs = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1000);
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OTLiveScreen() {
  const [rooms, setRooms] = useState<OTRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRooms = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/ot/rooms');
      const list = Array.isArray(data) ? data : data.data ?? data.rooms ?? [];
      setRooms(list);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load OT rooms' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Elapsed-time counter — tick every second
  useEffect(() => {
    tickRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    autoRefreshRef.current = setInterval(() => fetchRooms(true), 15_000);
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [fetchRooms]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRooms(true);
  }, [fetchRooms]);

  const handleComplete = useCallback(async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      await api.patch(`/ot/bookings/${bookingId}/complete`, {}, { headers: { 'X-Offline': 'true' } });
      Toast.show({ type: 'success', text1: 'Surgery completed' });
      fetchRooms(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to complete surgery' });
    } finally {
      setActionLoading(null);
    }
  }, [fetchRooms]);

  const renderRoomCard = (room: OTRoom) => {
    const sc = STATUS_COLORS[room.status] ?? STATUS_COLORS.FREE;
    const roomLabel = room.name ?? room.roomNumber ?? room.id.slice(0, 6);
    const booking = room.currentBooking;
    const surgeonName = booking?.surgeon?.name ?? booking?.surgeonName ?? '';

    return (
      <View key={room.id} style={styles.roomCard}>
        {/* Room header */}
        <View style={styles.roomHeader}>
          <View style={styles.roomNameWrap}>
            <Ionicons name="business-outline" size={18} color={colors.primary} />
            <Text style={styles.roomName}>{roomLabel}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: sc.text }]} />
            <Text style={[styles.statusLabel, { color: sc.text }]}>{sc.label}</Text>
          </View>
        </View>

        {/* Active surgery details */}
        {room.status === 'IN_USE' && booking && (
          <View style={styles.surgeryInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="cut-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.infoText}>{booking.procedureName ?? 'Surgery'}</Text>
            </View>
            {surgeonName ? (
              <View style={styles.infoRow}>
                <Ionicons name="medkit-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.infoText}>Dr. {surgeonName}</Text>
              </View>
            ) : null}
            <View style={styles.elapsedRow}>
              <Ionicons name="timer-outline" size={16} color={colors.danger} />
              <Text style={styles.elapsedText}>{formatElapsed(booking.startTime)}</Text>
            </View>
            <Button
              title="Complete Surgery"
              onPress={() => handleComplete(booking.id)}
              loading={actionLoading === booking.id}
              variant="danger"
              size="sm"
              style={styles.completeBtn}
            />
          </View>
        )}

        {room.status === 'MAINTENANCE' && (
          <View style={styles.maintenanceNotice}>
            <Ionicons name="construct-outline" size={16} color={colors.warning} />
            <Text style={styles.maintenanceText}>Under maintenance</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="OT Live Status" subtitle={`${rooms.length} rooms`} />

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : rooms.length === 0 ? (
        <EmptyState icon="business-outline" title="No OT rooms" subtitle="No operating rooms configured" />
      ) : (
        <ScrollView
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {rooms.map(renderRoomCard)}
        </ScrollView>
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
  loader: {
    marginTop: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.sm,
  },
  roomCard: {
    width: '48%' as any,
    minWidth: 160,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadow.sm,
  },
  roomHeader: {
    marginBottom: spacing.sm,
  },
  roomNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  roomName: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    gap: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  surgeryInfo: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
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
    flex: 1,
  },
  elapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  elapsedText: {
    ...typography.body,
    fontWeight: fontWeight.bold,
    color: colors.danger,
  },
  completeBtn: {
    marginTop: spacing.sm,
  },
  maintenanceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  maintenanceText: {
    ...typography.bodySmall,
    color: colors.warning,
  },
});
