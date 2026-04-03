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
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme';
import { Header, EmptyState } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Vital {
  id: string;
  date?: string;
  createdAt?: string;
  bloodPressure?: string;
  heartRate?: number;
  spO2?: number;
  temperature?: number;
}

export default function PatientVitalsScreen() {
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/auth/patient/me/vitals');
      const list = Array.isArray(data) ? data : data.data ?? data.vitals ?? [];
      setVitals(list);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load vitals' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  const formatDate = (d?: string) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const latest = vitals.length > 0 ? vitals[0] : null;

  const renderHeader = () => {
    if (!latest) return null;
    return (
      <View style={styles.latestCard}>
        <Text style={styles.latestTitle}>Latest Vitals</Text>
        <View style={styles.vitalsGrid}>
          <View style={styles.vitalItem}>
            <Ionicons name="heart-outline" size={24} color={colors.danger} />
            <Text style={styles.vitalValue}>{latest.bloodPressure ?? '--'}</Text>
            <Text style={styles.vitalLabel}>Blood Pressure</Text>
          </View>
          <View style={styles.vitalItem}>
            <Ionicons name="pulse-outline" size={24} color={colors.info} />
            <Text style={styles.vitalValue}>{latest.heartRate ?? '--'}</Text>
            <Text style={styles.vitalLabel}>Heart Rate</Text>
          </View>
          <View style={styles.vitalItem}>
            <Ionicons name="water-outline" size={24} color={colors.primary} />
            <Text style={styles.vitalValue}>{latest.spO2 != null ? `${latest.spO2}%` : '--'}</Text>
            <Text style={styles.vitalLabel}>SpO2</Text>
          </View>
          <View style={styles.vitalItem}>
            <Ionicons name="thermometer-outline" size={24} color={colors.warning} />
            <Text style={styles.vitalValue}>{latest.temperature != null ? `${latest.temperature}\u00B0F` : '--'}</Text>
            <Text style={styles.vitalLabel}>Temperature</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHistoryItem = ({ item, index }: { item: Vital; index: number }) => {
    // Skip first item if it's the same as latest (shown in header)
    if (index === 0 && latest) return null;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.historyRow}>
        <Text style={styles.historyDate}>{formatDate(item.date ?? item.createdAt)}</Text>
        <Text style={styles.historyCell}>{item.bloodPressure ?? '--'}</Text>
        <Text style={styles.historyCell}>{item.heartRate ?? '--'}</Text>
        <Text style={styles.historyCell}>{item.spO2 != null ? `${item.spO2}%` : '--'}</Text>
        <Text style={styles.historyCell}>{item.temperature != null ? `${item.temperature}\u00B0` : '--'}</Text>
      </View>
      </SafeAreaView>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="My Vitals" />
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={vitals}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          ListHeaderComponent={() => (
            <>
              {renderHeader()}
              {vitals.length > 1 && (
                <>
                  <Text style={styles.historyTitle}>History</Text>
                  <View style={styles.historyHeader}>
                    <Text style={[styles.historyHeaderCell, { flex: 1.5 }]}>Date</Text>
                    <Text style={styles.historyHeaderCell}>BP</Text>
                    <Text style={styles.historyHeaderCell}>HR</Text>
                    <Text style={styles.historyHeaderCell}>SpO2</Text>
                    <Text style={styles.historyHeaderCell}>Temp</Text>
                  </View>
                </>
              )}
            </>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={vitals.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={<EmptyState icon="heart-outline" title="No vitals recorded" subtitle="Your vitals will appear here" />}
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
  loader: {
    marginTop: 40,
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  latestCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.lg,
    ...shadow.sm,
  },
  latestTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  vitalItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  vitalValue: {
    ...typography.h3,
    color: colors.text,
    marginTop: 4,
  },
  vitalLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    backgroundColor: colors.borderLight,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: borderRadius.sm,
    marginBottom: 4,
  },
  historyHeaderCell: {
    flex: 1,
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  historyRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  historyDate: {
    flex: 1.5,
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
  },
  historyCell: {
    flex: 1,
    ...typography.caption,
    color: colors.text,
    textAlign: 'center',
  },
});
