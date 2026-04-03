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
import { Header, StatusBadge, getStatusVariant, EmptyState, Button } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface InsurancePolicy {
  id: string;
  provider?: string;
  policyNumber?: string;
  patient?: { id: string; name: string };
  patientName?: string;
  status: string;
}

interface InsuranceClaim {
  id: string;
  claimNumber?: string;
  patient?: { id: string; name: string };
  patientName?: string;
  amount?: number;
  status: string;
}

type TabKey = 'policies' | 'claims';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCurrency(amount?: number): string {
  if (amount == null) return '\u20B90';
  return `\u20B9${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function InsuranceScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>('policies');

  // Policies
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [policiesRefreshing, setPoliciesRefreshing] = useState(false);

  // Claims
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [claimsRefreshing, setClaimsRefreshing] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* --- Fetchers --- */

  const fetchPolicies = useCallback(async (silent = false) => {
    if (!silent) setPoliciesLoading(true);
    try {
      const { data } = await api.get('/insurance/policies');
      const list = Array.isArray(data) ? data : data.data ?? data.policies ?? [];
      setPolicies(list);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load policies' });
    } finally {
      setPoliciesLoading(false);
      setPoliciesRefreshing(false);
    }
  }, []);

  const fetchClaims = useCallback(async (silent = false) => {
    if (!silent) setClaimsLoading(true);
    try {
      const { data } = await api.get('/insurance/claims');
      const list = Array.isArray(data) ? data : data.data ?? data.claims ?? [];
      setClaims(list);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load claims' });
    } finally {
      setClaimsLoading(false);
      setClaimsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
    fetchClaims();
  }, [fetchPolicies, fetchClaims]);

  /* --- Claim actions --- */

  const handleSubmitClaim = useCallback(async (id: string) => {
    setActionLoading(id);
    try {
      await api.patch(`/insurance/claims/${id}/submit`, {}, { headers: { 'X-Offline': 'true' } });
      Toast.show({ type: 'success', text1: 'Claim submitted' });
      fetchClaims(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to submit claim' });
    } finally {
      setActionLoading(null);
    }
  }, [fetchClaims]);

  const handleApproveClaim = useCallback(async (id: string) => {
    setActionLoading(id);
    try {
      await api.patch(`/insurance/claims/${id}/approve`, {}, { headers: { 'X-Offline': 'true' } });
      Toast.show({ type: 'success', text1: 'Claim approved' });
      fetchClaims(true);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to approve claim' });
    } finally {
      setActionLoading(null);
    }
  }, [fetchClaims]);

  /* --- Renderers --- */

  const renderPolicy = ({ item }: { item: InsurancePolicy }) => {
    const patientName = item.patient?.name ?? item.patientName ?? 'Unknown';
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.providerWrap}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            <Text style={styles.provider} numberOfLines={1}>{item.provider ?? 'Insurance'}</Text>
          </View>
          <StatusBadge label={item.status} variant={getStatusVariant(item.status)} />
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Policy #:</Text>
          <Text style={styles.infoValue}>{item.policyNumber ?? '--'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Patient:</Text>
          <Text style={styles.infoValue}>{patientName}</Text>
        </View>
      </View>
      </SafeAreaView>
    );
  };

  const renderClaim = ({ item }: { item: InsuranceClaim }) => {
    const patientName = item.patient?.name ?? item.patientName ?? 'Unknown';
    const isLoading = actionLoading === item.id;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.providerWrap}>
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            <Text style={styles.provider} numberOfLines={1}>
              {item.claimNumber ?? `#${item.id.slice(0, 6)}`}
            </Text>
          </View>
          <StatusBadge label={item.status} variant={getStatusVariant(item.status)} />
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Patient:</Text>
          <Text style={styles.infoValue}>{patientName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Amount:</Text>
          <Text style={[styles.infoValue, { fontWeight: fontWeight.semibold }]}>
            {formatCurrency(item.amount)}
          </Text>
        </View>

        {item.status === 'PENDING' && (
          <Button
            title="Submit Claim"
            onPress={() => handleSubmitClaim(item.id)}
            loading={isLoading}
            size="sm"
            style={styles.actionBtn}
          />
        )}
        {item.status === 'SUBMITTED' && (
          <Button
            title="Approve Claim"
            onPress={() => handleApproveClaim(item.id)}
            loading={isLoading}
            variant="secondary"
            size="sm"
            style={styles.actionBtn}
          />
        )}
      </View>
      </SafeAreaView>
    );
  };

  const renderTab = (key: TabKey, label: string) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === key && styles.tabActive]}
      onPress={() => setActiveTab(key)}
    >
      <Text style={[styles.tabText, activeTab === key && styles.tabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const isLoading = activeTab === 'policies' ? policiesLoading : claimsLoading;
  const isRefreshing = activeTab === 'policies' ? policiesRefreshing : claimsRefreshing;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="Insurance" subtitle={activeTab === 'policies' ? `${policies.length} policies` : `${claims.length} claims`} />

      {/* Tabs */}
      <View style={styles.tabBar}>
        {renderTab('policies', 'Policies')}
        {renderTab('claims', 'Claims')}
      </View>

      {isLoading && !isRefreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : activeTab === 'policies' ? (
        <FlatList
          data={policies}
          keyExtractor={(item) => item.id}
          renderItem={renderPolicy}
          refreshControl={
            <RefreshControl
              refreshing={policiesRefreshing}
              onRefresh={() => {
                setPoliciesRefreshing(true);
                fetchPolicies(true);
              }}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={policies.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <EmptyState icon="shield-checkmark-outline" title="No policies" subtitle="No insurance policies found" />
          }
        />
      ) : (
        <FlatList
          data={claims}
          keyExtractor={(item) => item.id}
          renderItem={renderClaim}
          refreshControl={
            <RefreshControl
              refreshing={claimsRefreshing}
              onRefresh={() => {
                setClaimsRefreshing(true);
                fetchClaims(true);
              }}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={claims.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <EmptyState icon="document-text-outline" title="No claims" subtitle="No insurance claims found" />
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
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.base,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
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
  providerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: spacing.sm,
  },
  provider: {
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
    width: 65,
  },
  infoValue: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
  },
  actionBtn: {
    marginTop: spacing.sm,
  },
});
