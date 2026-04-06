import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography, fontSize, fontWeight } from '../../theme/typography';
import { borderRadius, shadow } from '../../theme';
import { EmptyState, Button } from '../../components';
import api from '../../lib/api';
import { offlinePatch } from '../../lib/offlineApi';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MARRecord {
  id: string;
  patient?: { id: string; name: string };
  patientName?: string;
  drugName?: string;
  medication?: { name: string };
  dose: string;
  frequency: string;
  scheduledTime: string;
  status: 'OVERDUE' | 'DUE_NOW' | 'UPCOMING' | 'ADMINISTERED' | string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getRowBg(status: string): string {
  switch (status?.toUpperCase()) {
    case 'OVERDUE':
      return colors.dangerLight;
    case 'DUE_NOW':
      return colors.warningLight;
    default:
      return colors.card;
  }
}

function getRowBorderColor(status: string): string {
  switch (status?.toUpperCase()) {
    case 'OVERDUE':
      return colors.danger;
    case 'DUE_NOW':
      return colors.warning;
    default:
      return 'transparent';
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function MARScreen() {
  const [records, setRecords] = useState<MARRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [administeringId, setAdministeringId] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    try {
      const { data } = await api.get('/medication-admin/pending');
      const list = Array.isArray(data) ? data : data.data ?? data.items ?? [];
      setRecords(list);
    } catch {
      Alert.alert('Error', 'Failed to load pending medications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRecords();
  }, [fetchRecords]);

  const handleAdminister = (record: MARRecord) => {
    const drug = record.drugName ?? record.medication?.name ?? 'this medication';
    const patient = record.patient?.name ?? record.patientName ?? 'the patient';

    Alert.alert(
      'Confirm Administration',
      `Administer ${drug} (${record.dose}) to ${patient}?\n\nFive-rights verification will be recorded.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Administer',
          onPress: async () => {
            setAdministeringId(record.id);
            try {
              const result = await offlinePatch(
                `/medication-admin/${record.id}/administer`,
                {
                  administeredAt: new Date().toISOString(),
                  fiveRightsVerified: true,
                },
              );
              if (result._offline) {
                Toast.show({
                  type: 'info',
                  text1: 'Saved offline',
                  text2: 'Administration will sync when online',
                });
              } else {
                Toast.show({ type: 'success', text1: 'Medication administered' });
              }
              fetchRecords();
            } catch {
              Alert.alert('Error', 'Failed to administer medication');
            } finally {
              setAdministeringId(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: MARRecord }) => {
    const name = item.patient?.name ?? item.patientName ?? 'Unknown';
    const drug = item.drugName ?? item.medication?.name ?? '--';
    const bg = getRowBg(item.status);
    const border = getRowBorderColor(item.status);
    const isActionable = ['OVERDUE', 'DUE_NOW'].includes(item.status?.toUpperCase());

    return (
      <View style={[styles.card, shadow.sm, { backgroundColor: bg, borderLeftColor: border, borderLeftWidth: border !== 'transparent' ? 3 : 0 }]}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.patientName}>{name}</Text>
            <Text style={styles.drugName}>{drug}</Text>
            <Text style={styles.detail}>
              {item.dose}  |  {item.frequency}
            </Text>
          </View>
          <View style={styles.timeSection}>
            <Text style={[styles.status, { color: getRowBorderColor(item.status) || colors.textSecondary }]}>
              {item.status?.replace(/_/g, ' ')}
            </Text>
            <Text style={styles.time}>{formatTime(item.scheduledTime)}</Text>
          </View>
        </View>
        {isActionable && (
          <Button
            title="Administer"
            variant={item.status === 'OVERDUE' ? 'danger' : 'primary'}
            size="sm"
            loading={administeringId === item.id}
            onPress={() => handleAdminister(item)}
            style={styles.adminBtn}
          />
        )}
      </View>
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={records.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState icon="medkit-outline" title="No pending medications" subtitle="All medications are up to date" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />
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
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  patientName: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  drugName: {
    ...typography.body,
    color: colors.primary,
    marginTop: 2,
  },
  detail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timeSection: {
    alignItems: 'flex-end',
  },
  status: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
  },
  time: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  adminBtn: {
    marginTop: 10,
    alignSelf: 'flex-end',
  },
});
