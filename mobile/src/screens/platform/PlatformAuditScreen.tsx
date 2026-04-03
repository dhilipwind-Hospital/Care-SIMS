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
import { EmptyState } from '../../components';
import api from '../../lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AuditEntry {
  id: string;
  eventType?: string;
  action?: string;
  actor?: string;
  actorName?: string;
  user?: { name?: string; email?: string };
  target?: string;
  targetName?: string;
  resource?: string;
  description?: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}

function getEventIcon(eventType?: string): string {
  const type = (eventType ?? '').toUpperCase();
  if (type.includes('CREATE') || type.includes('ADD')) return 'add-circle-outline';
  if (type.includes('UPDATE') || type.includes('EDIT')) return 'create-outline';
  if (type.includes('DELETE') || type.includes('REMOVE')) return 'trash-outline';
  if (type.includes('LOGIN') || type.includes('AUTH')) return 'log-in-outline';
  if (type.includes('VERIFY')) return 'checkmark-circle-outline';
  if (type.includes('REJECT')) return 'close-circle-outline';
  return 'document-text-outline';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PlatformAuditScreen() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    try {
      setError(null);
      const { data } = await api.get('/platform/audit');
      const list = Array.isArray(data) ? data : data.data ?? data.items ?? [];
      setEntries(list);
    } catch {
      setError('Failed to load audit log');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAudit();
  }, [fetchAudit]);

  const renderItem = ({ item }: { item: AuditEntry }) => {
    const eventType = item.eventType ?? item.action ?? 'EVENT';
    const actor = item.actor ?? item.actorName ?? item.user?.name ?? item.user?.email ?? 'System';
    const target = item.target ?? item.targetName ?? item.resource ?? item.description ?? '--';
    const iconName = getEventIcon(eventType);

    return (
      <View style={[styles.card, shadow.sm]}>
        <View style={styles.iconWrap}>
          <Ionicons name={iconName as any} size={20} color={colors.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.eventType}>{eventType}</Text>
          <Text style={styles.actor}>{actor}</Text>
          <Text style={styles.target} numberOfLines={2}>{target}</Text>
        </View>
        <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
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

  if (error && !loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 12 }}>{error}</Text>
          <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' }}>Pull down to retry or check your connection</Text>
          <TouchableOpacity onPress={() => { setError(null); setLoading(true); fetchAudit(); }} style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#0F766E', borderRadius: 8 }}>
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
          <Text style={styles.headerTitle}>Audit Log</Text>
          <Text style={styles.headerSubtitle}>Platform activity history</Text>
        </View>

        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={entries.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={<EmptyState icon="shield-outline" title="No audit entries" subtitle="Activity logs will appear here" />}
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
  list: {
    padding: 16,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
    marginRight: 8,
  },
  eventType: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
  },
  actor: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: 2,
  },
  target: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  time: {
    ...typography.caption,
    color: colors.textTertiary,
    minWidth: 60,
    textAlign: 'right',
  },
});
