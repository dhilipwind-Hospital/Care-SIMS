import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { KpiCard, StatusBadge, getStatusVariant, EmptyState, Button, Input, BottomSheet } from '../../components';
import api from '../../lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface QueueToken {
  id: string;
  tokenNumber: string | number;
  patient?: { id: string; name: string };
  patientName?: string;
  doctor?: { name: string };
  doctorName?: string;
  status: string;
  waitTime?: number;
  createdAt: string;
}

interface QueueStats {
  waiting: number;
  called: number;
  inConsult: number;
  completed: number;
}

interface PatientResult {
  id: string;
  name: string;
  patientId: string;
}

interface DoctorOption {
  id: string;
  name: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function QueueScreen() {
  const navigation = useNavigation<any>();
  const [tokens, setTokens] = useState<QueueToken[]>([]);
  const [stats, setStats] = useState<QueueStats>({ waiting: 0, called: 0, inConsult: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Issue token modal
  const [showModal, setShowModal] = useState(false);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null);
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT' | 'EMERGENCY'>('NORMAL');
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showDoctorPicker, setShowDoctorPicker] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      const { data } = await api.get('/queue');
      let list: QueueToken[] = [];
      let fetchedStats: QueueStats = { waiting: 0, called: 0, inConsult: 0, completed: 0 };

      if (Array.isArray(data)) {
        list = data;
      } else {
        list = data.tokens ?? data.data ?? data.items ?? [];
        if (data.stats) {
          fetchedStats = data.stats;
        }
      }

      // Calculate stats from list if not provided
      if (!fetchedStats.waiting && !fetchedStats.completed) {
        fetchedStats = {
          waiting: list.filter((t) => t.status?.toUpperCase() === 'WAITING').length,
          called: list.filter((t) => t.status?.toUpperCase() === 'CALLED').length,
          inConsult: list.filter((t) => ['IN_CONSULT', 'IN_PROGRESS'].includes(t.status?.toUpperCase())).length,
          completed: list.filter((t) => t.status?.toUpperCase() === 'COMPLETED').length,
        };
      }

      setTokens(list);
      setStats(fetchedStats);
    } catch {
      setError('Failed to load queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    // Auto-refresh every 30s
    timerRef.current = setInterval(fetchQueue, 30000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchQueue]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchQueue();
  }, [fetchQueue]);

  /* Patient search */
  useEffect(() => {
    if (patientQuery.length < 2) {
      setPatientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get('/patients', { params: { q: patientQuery } });
        const list = Array.isArray(data) ? data : data.data ?? data.items ?? [];
        setPatientResults(list.slice(0, 8));
      } catch {
        /* ignore */
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [patientQuery]);

  /* Fetch doctors on modal open */
  useEffect(() => {
    if (showModal && doctors.length === 0) {
      api.get('/doctors').then(({ data }) => {
        const list = Array.isArray(data) ? data : data.data ?? data.items ?? [];
        setDoctors(list.map((d: any) => ({ id: d.id, name: d.name ?? `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() })));
      }).catch(() => {});
    }
  }, [showModal]);

  const resetModal = () => {
    setPatientQuery('');
    setPatientResults([]);
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setPriority('NORMAL');
    setShowDoctorPicker(false);
  };

  const handleScanWristband = (data: string) => {
    // Open the issue token modal and run a lookup
    setShowModal(true);
    setPatientQuery(data);
    // Try to resolve the scanned ID directly
    api
      .get('/patients', { params: { q: data } })
      .then(({ data: res }) => {
        const list = Array.isArray(res) ? res : res.data ?? res.items ?? [];
        if (list.length === 1) {
          setSelectedPatient({
            id: list[0].id,
            name: list[0].name ?? `${list[0].firstName ?? ''} ${list[0].lastName ?? ''}`.trim(),
            patientId: list[0].patientId,
          });
          setPatientResults([]);
        } else {
          setPatientResults(list.slice(0, 8));
        }
      })
      .catch(() => {});
  };

  const handleIssueToken = async () => {
    if (!selectedPatient) {
      Alert.alert('Validation', 'Please select a patient');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/queue/token', {
        patientId: selectedPatient.id,
        doctorId: selectedDoctor?.id,
        priority,
      });
      setShowModal(false);
      resetModal();
      fetchQueue();
    } catch {
      Alert.alert('Error', 'Failed to issue token');
    } finally {
      setSubmitting(false);
    }
  };

  const formatWaitTime = (token: QueueToken): string => {
    if (token.waitTime != null) {
      return `${token.waitTime} min`;
    }
    const diff = Math.floor((Date.now() - new Date(token.createdAt).getTime()) / 60000);
    return `${diff} min`;
  };

  const renderItem = ({ item }: { item: QueueToken }) => {
    const name = item.patient?.name ?? item.patientName ?? 'Unknown';
    const doctor = item.doctor?.name ?? item.doctorName ?? '--';

    return (
      <View style={[styles.card, shadow.sm]}>
        <View style={styles.tokenCircle}>
          <Text style={styles.tokenNumber}>{item.tokenNumber}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.doctor}>Dr. {doctor}</Text>
          <Text style={styles.wait}>{formatWaitTime(item)} wait</Text>
        </View>
        <StatusBadge label={item.status} variant={getStatusVariant(item.status)} />
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
          <TouchableOpacity onPress={() => { setError(null); setLoading(true); fetchQueue(); }} style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#0F766E', borderRadius: 8 }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      {/* KPI Row */}
      <View style={styles.kpiRow}>
        <KpiCard label="Waiting" value={stats.waiting} color={colors.warning} />
        <KpiCard label="Called" value={stats.called} color={colors.info} />
        <KpiCard label="In Consult" value={stats.inConsult} color={colors.primary} />
        <KpiCard label="Done" value={stats.completed} color={colors.success} />
      </View>

      <FlatList
        data={tokens}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={tokens.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState icon="people-outline" title="Queue is empty" subtitle="Issue a token to get started" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />

      {/* Scan Wristband Button */}
      <TouchableOpacity
        style={styles.scanFab}
        accessibilityLabel="Scan patient wristband"
        onPress={() =>
          navigation.navigate('Scanner', {
            onScan: (data: string) => handleScanWristband(data),
          })
        }
        activeOpacity={0.8}
      >
        <Ionicons name="scan" size={22} color={colors.primary} />
      </TouchableOpacity>

      {/* Issue Token Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowModal(true)} activeOpacity={0.8}>
        <Ionicons name="ticket-outline" size={24} color={colors.white} />
      </TouchableOpacity>

      {/* Issue Token Modal */}
      <BottomSheet visible={showModal} onClose={() => { setShowModal(false); resetModal(); }} title="Issue Token">
        {/* Patient search */}
        {!selectedPatient ? (
          <>
            <Input
              label="Search Patient"
              placeholder="Name or ID..."
              value={patientQuery}
              onChangeText={setPatientQuery}
              leftIcon={<Ionicons name="search-outline" size={18} color={colors.textTertiary} />}
            />
            {searching && <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 8 }} />}
            {patientResults.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.searchResult}
                onPress={() => { setSelectedPatient(p); setPatientResults([]); }}
              >
                <Text style={styles.searchName}>{p.name}</Text>
                <Text style={styles.searchId}>{p.patientId}</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View style={styles.selectedRow}>
            <Text style={styles.selectedName}>Patient: {selectedPatient.name}</Text>
            <TouchableOpacity onPress={() => setSelectedPatient(null)}>
              <Ionicons name="close-circle" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}

        {/* Doctor picker */}
        <Text style={styles.formLabel}>Doctor</Text>
        {!selectedDoctor ? (
          <>
            <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowDoctorPicker(!showDoctorPicker)}>
              <Text style={styles.pickerText}>Select a doctor...</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
            {showDoctorPicker && doctors.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={styles.searchResult}
                onPress={() => { setSelectedDoctor(d); setShowDoctorPicker(false); }}
              >
                <Text style={styles.searchName}>Dr. {d.name}</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View style={styles.selectedRow}>
            <Text style={styles.selectedName}>Dr. {selectedDoctor.name}</Text>
            <TouchableOpacity onPress={() => setSelectedDoctor(null)}>
              <Ionicons name="close-circle" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}

        {/* Priority */}
        <Text style={styles.formLabel}>Priority</Text>
        <View style={styles.priorityRow}>
          {(['NORMAL', 'URGENT', 'EMERGENCY'] as const).map((p) => {
            const active = priority === p;
            const c = p === 'EMERGENCY' ? colors.danger : p === 'URGENT' ? colors.warning : colors.primary;
            return (
              <TouchableOpacity
                key={p}
                style={[styles.priorityChip, { borderColor: c }, active && { backgroundColor: c }]}
                onPress={() => setPriority(p)}
              >
                <Text style={[styles.priorityText, { color: active ? colors.white : c }]}>{p}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button title="Issue Token" onPress={handleIssueToken} loading={submitting} style={{ marginTop: 12, marginBottom: 16 }} />
      </BottomSheet>
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
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 16,
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
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: 10,
  },
  tokenCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tokenNumber: {
    ...typography.h4,
    color: colors.primary,
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  doctor: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  wait: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },
  scanFab: {
    position: 'absolute',
    right: 20,
    bottom: 92,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  formLabel: {
    ...typography.label,
    color: colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  searchResult: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchName: {
    ...typography.body,
    color: colors.text,
  },
  searchId: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight + '15',
    padding: 12,
    borderRadius: borderRadius.base,
    marginBottom: 14,
  },
  selectedName: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  pickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.base,
    padding: 12,
    marginBottom: 8,
  },
  pickerText: {
    ...typography.body,
    color: colors.textTertiary,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.base,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  priorityText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
