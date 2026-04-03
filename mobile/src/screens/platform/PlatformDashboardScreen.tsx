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
import { KpiCard, StatusBadge, getStatusVariant, EmptyState } from '../../components';
import api from '../../lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Organization {
  id: string;
  name: string;
  slug?: string;
  plan?: string;
  status: string;
  userCount?: number;
  _count?: { users?: number };
  createdAt: string;
}

interface OrgStats {
  total: number;
  active: number;
  trial: number;
  suspended: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PlatformDashboardScreen() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<OrgStats>({ total: 0, active: 0, trial: 0, suspended: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get('/platform/organizations');
      const list: Organization[] = Array.isArray(data) ? data : data.data ?? data.items ?? [];

      setOrganizations(list);

      // Calculate stats from list
      const computedStats: OrgStats = {
        total: list.length,
        active: list.filter((o) => o.status?.toUpperCase() === 'ACTIVE').length,
        trial: list.filter((o) => o.status?.toUpperCase() === 'TRIAL').length,
        suspended: list.filter((o) => o.status?.toUpperCase() === 'SUSPENDED').length,
      };
      setStats(computedStats);
    } catch {
      setError('Failed to load organizations');
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
    fetchData();
  }, [fetchData]);

  const handleOrgPress = (org: Organization) => {
    const userCount = org.userCount ?? org._count?.users ?? 'N/A';
    Alert.alert(
      org.name,
      `Plan: ${org.plan ?? 'N/A'}\nStatus: ${org.status}\nUsers: ${userCount}\nCreated: ${formatDate(org.createdAt)}`,
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderItem = ({ item }: { item: Organization }) => {
    return (
      <TouchableOpacity
        style={[styles.card, shadow.sm]}
        onPress={() => handleOrgPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View style={styles.orgIcon}>
            <Ionicons name="business-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.orgName}>{item.name}</Text>
            <Text style={styles.orgPlan}>{item.plan ?? 'No plan'}</Text>
            <Text style={styles.orgDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
        <StatusBadge label={item.status} variant={getStatusVariant(item.status)} />
      </TouchableOpacity>
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
          <TouchableOpacity onPress={() => { setError(null); setLoading(true); fetchData(); }} style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#0F766E', borderRadius: 8 }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Platform Admin</Text>
          <Text style={styles.headerSubtitle}>Organization Management</Text>
        </View>

        {/* KPI Row */}
        <View style={styles.kpiRow}>
          <KpiCard label="Total Orgs" value={stats.total} color={colors.info} />
          <KpiCard label="Active" value={stats.active} color={colors.success} />
          <KpiCard label="Trial" value={stats.trial} color={colors.warning} />
          <KpiCard label="Suspended" value={stats.suspended} color={colors.danger} />
        </View>

        <FlatList
          data={organizations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={organizations.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={<EmptyState icon="business-outline" title="No organizations" subtitle="Organizations will appear here" />}
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  list: {
    padding: 16,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: 10,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  orgIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  orgName: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  orgPlan: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  orgDate: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
});
