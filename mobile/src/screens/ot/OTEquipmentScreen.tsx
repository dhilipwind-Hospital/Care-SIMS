import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
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
import { Header, StatusBadge, EmptyState, Button } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OTEquipment {
  id: string;
  name?: string;
  type?: string;
  serialNumber?: string;
  condition?: string;
  sterilizationStatus?: string;
  lastSterilizedAt?: string;
  nextSterilizationDue?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type SterileVariant = 'success' | 'warning' | 'info' | 'danger' | 'default';

const STERILE_COLORS: Record<string, { variant: SterileVariant; label: string }> = {
  STERILIZED: { variant: 'success', label: 'Sterilized' },
  PENDING_STERILIZATION: { variant: 'warning', label: 'Pending' },
  IN_STERILIZATION: { variant: 'info', label: 'In Sterilization' },
  QUARANTINED: { variant: 'danger', label: 'Quarantined' },
};

function formatDate(iso?: string): string {
  if (!iso) return '--';
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function OTEquipmentScreen() {
  const [equipment, setEquipment] = useState<OTEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchEquipment = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/ot/equipment');
      const list = Array.isArray(data) ? data : data.data ?? data.equipment ?? [];
      setEquipment(list);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load equipment' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEquipment(true);
  }, [fetchEquipment]);

  const handleSterilize = useCallback(async (id: string) => {
    setActionLoading(id);
    try {
      await api.patch(`/ot/equipment/${id}/sterilize`, {}, { headers: { 'X-Offline': 'true' } });
      Toast.show({ type: 'success', text1: 'Sterilization started' });
      fetchEquipment(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to sterilize' });
    } finally {
      setActionLoading(null);
    }
  }, [fetchEquipment]);

  const renderEquipment = ({ item }: { item: OTEquipment }) => {
    const sterile = STERILE_COLORS[item.sterilizationStatus ?? ''] ?? { variant: 'default' as SterileVariant, label: item.sterilizationStatus ?? '--' };
    const conditionVariant: SterileVariant =
      item.condition === 'GOOD' ? 'success' :
      item.condition === 'FAIR' ? 'warning' :
      item.condition === 'POOR' ? 'danger' : 'default';

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.nameWrap}>
            <Ionicons name="hardware-chip-outline" size={18} color={colors.primary} />
            <Text style={styles.equipName} numberOfLines={1}>{item.name ?? 'Equipment'}</Text>
          </View>
        </View>

        {item.type && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type:</Text>
            <Text style={styles.infoValue}>{item.type}</Text>
          </View>
        )}
        {item.serialNumber && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Serial:</Text>
            <Text style={styles.infoValue}>{item.serialNumber}</Text>
          </View>
        )}

        <View style={styles.badgeRow}>
          {item.condition && (
            <StatusBadge label={item.condition} variant={conditionVariant} />
          )}
          <StatusBadge label={sterile.label} variant={sterile.variant} />
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Last Sterilized</Text>
            <Text style={styles.dateValue}>{formatDate(item.lastSterilizedAt)}</Text>
          </View>
          <View style={styles.dateItem}>
            <Text style={styles.dateLabel}>Next Due</Text>
            <Text style={styles.dateValue}>{formatDate(item.nextSterilizationDue)}</Text>
          </View>
        </View>

        {item.sterilizationStatus === 'PENDING_STERILIZATION' && (
          <Button
            title="Sterilize"
            onPress={() => handleSterilize(item.id)}
            loading={actionLoading === item.id}
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
      <Header title="OT Equipment" subtitle={`${equipment.length} items`} />

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={equipment}
          keyExtractor={(item) => item.id}
          renderItem={renderEquipment}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={equipment.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <EmptyState icon="hardware-chip-outline" title="No equipment" subtitle="No OT equipment found" />
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
  loader: {
    marginTop: 40,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
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
    marginBottom: spacing.sm,
  },
  nameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  equipName: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  infoLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    width: 50,
  },
  infoValue: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  dateValue: {
    ...typography.bodySmall,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginTop: 2,
  },
  actionBtn: {
    marginTop: spacing.sm,
  },
});
