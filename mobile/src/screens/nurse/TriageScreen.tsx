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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography, fontSize, fontWeight } from '../../theme/typography';
import { borderRadius, shadow } from '../../theme';
import { StatusBadge, EmptyState, Button, Input, BottomSheet } from '../../components';
import api from '../../lib/api';
import { offlinePost } from '../../lib/offlineApi';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TriageRecord {
  id: string;
  patient?: { id: string; name: string };
  patientName?: string;
  triageLevel: 'IMMEDIATE' | 'URGENT' | 'SEMI_URGENT' | 'ROUTINE' | 'NON_URGENT';
  chiefComplaint: string;
  createdAt: string;
}

interface PatientResult {
  id: string;
  name: string;
  patientId: string;
}

const TRIAGE_LEVELS = [
  { value: 'IMMEDIATE', label: 'Immediate', color: colors.danger },
  { value: 'URGENT', label: 'Urgent', color: '#F97316' },
  { value: 'SEMI_URGENT', label: 'Semi-Urgent', color: colors.warning },
  { value: 'ROUTINE', label: 'Routine', color: colors.success },
  { value: 'NON_URGENT', label: 'Non-Urgent', color: colors.info },
] as const;

function triageLevelColor(level: string): string {
  return TRIAGE_LEVELS.find((t) => t.value === level)?.color ?? colors.textSecondary;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TriageScreen() {
  const [records, setRecords] = useState<TriageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string>('ROUTINE');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [bpSystolic, setBpSystolic] = useState('');
  const [bpDiastolic, setBpDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [spO2, setSpO2] = useState('');
  const [temperature, setTemperature] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [painScore, setPainScore] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      const { data } = await api.get('/triage', { params: { page: 1, limit: 20 } });
      setRecords(Array.isArray(data) ? data : data.data ?? data.items ?? []);
    } catch {
      Alert.alert('Error', 'Failed to load triage records');
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

  /* Patient search with debounce */
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
        setPatientResults(list.slice(0, 10));
      } catch {
        /* ignore */
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [patientQuery]);

  const resetForm = () => {
    setPatientQuery('');
    setPatientResults([]);
    setSelectedPatient(null);
    setSelectedLevel('ROUTINE');
    setChiefComplaint('');
    setBpSystolic('');
    setBpDiastolic('');
    setHeartRate('');
    setSpO2('');
    setTemperature('');
    setRespiratoryRate('');
    setPainScore('');
  };

  const handleSubmit = async () => {
    if (!selectedPatient) {
      Alert.alert('Validation', 'Please select a patient');
      return;
    }
    if (!chiefComplaint.trim()) {
      Alert.alert('Validation', 'Please enter the chief complaint');
      return;
    }
    setSubmitting(true);
    try {
      const result = await offlinePost('/triage', {
        patientId: selectedPatient.id,
        triageLevel: selectedLevel,
        chiefComplaint: chiefComplaint.trim(),
        vitals: {
          bpSystolic: bpSystolic ? Number(bpSystolic) : undefined,
          bpDiastolic: bpDiastolic ? Number(bpDiastolic) : undefined,
          heartRate: heartRate ? Number(heartRate) : undefined,
          spO2: spO2 ? Number(spO2) : undefined,
          temperature: temperature ? Number(temperature) : undefined,
          respiratoryRate: respiratoryRate ? Number(respiratoryRate) : undefined,
          painScore: painScore ? Number(painScore) : undefined,
        },
      });
      if (result._offline) {
        Toast.show({
          type: 'info',
          text1: 'Saved offline',
          text2: 'Triage will sync when connection returns',
        });
      } else {
        Toast.show({ type: 'success', text1: 'Triage recorded' });
      }
      setShowForm(false);
      resetForm();
      fetchRecords();
    } catch {
      Alert.alert('Error', 'Failed to create triage record');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /* ---- Render ---- */

  const renderItem = ({ item }: { item: TriageRecord }) => {
    const name = item.patient?.name ?? item.patientName ?? 'Unknown';
    const levelColor = triageLevelColor(item.triageLevel);

    return (
      <View style={[styles.card, shadow.sm]}>
        <View style={styles.cardRow}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{name}</Text>
            <Text style={styles.cardComplaint} numberOfLines={1}>
              {item.chiefComplaint}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <View style={[styles.levelBadge, { backgroundColor: levelColor + '20' }]}>
              <View style={[styles.levelDot, { backgroundColor: levelColor }]} />
              <Text style={[styles.levelText, { color: levelColor }]}>
                {item.triageLevel.replace(/_/g, ' ')}
              </Text>
            </View>
            <Text style={styles.cardTime}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>
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
        ListEmptyComponent={<EmptyState icon="pulse-outline" title="No triage records" subtitle="Tap + to add a new triage assessment" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Bottom Sheet Form */}
      <BottomSheet visible={showForm} onClose={() => setShowForm(false)} title="New Triage">
        {/* Patient Search */}
        {!selectedPatient ? (
          <>
            <Input
              label="Search Patient"
              placeholder="Type name or ID..."
              value={patientQuery}
              onChangeText={setPatientQuery}
              leftIcon={<Ionicons name="search-outline" size={18} color={colors.textTertiary} />}
            />
            {searching && <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 8 }} />}
            {patientResults.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.searchResult}
                onPress={() => {
                  setSelectedPatient(p);
                  setPatientResults([]);
                }}
              >
                <Text style={styles.searchName}>{p.name}</Text>
                <Text style={styles.searchId}>{p.patientId}</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View style={styles.selectedPatient}>
            <Text style={styles.selectedName}>{selectedPatient.name}</Text>
            <TouchableOpacity onPress={() => setSelectedPatient(null)}>
              <Ionicons name="close-circle" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}

        {/* Triage Level Picker */}
        <Text style={styles.formLabel}>Triage Level</Text>
        <View style={styles.levelRow}>
          {TRIAGE_LEVELS.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[
                styles.levelChip,
                { borderColor: t.color },
                selectedLevel === t.value && { backgroundColor: t.color },
              ]}
              onPress={() => setSelectedLevel(t.value)}
            >
              <Text
                style={[
                  styles.levelChipText,
                  { color: selectedLevel === t.value ? colors.white : t.color },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Chief Complaint */}
        <Input
          label="Chief Complaint"
          placeholder="Describe the main complaint..."
          value={chiefComplaint}
          onChangeText={setChiefComplaint}
          multiline
          numberOfLines={2}
        />

        {/* Vitals */}
        <Text style={styles.formLabel}>Vitals</Text>
        <View style={styles.vitalsRow}>
          <Input label="BP Sys" placeholder="120" value={bpSystolic} onChangeText={setBpSystolic} keyboardType="numeric" containerStyle={styles.vitalInput} />
          <Input label="BP Dia" placeholder="80" value={bpDiastolic} onChangeText={setBpDiastolic} keyboardType="numeric" containerStyle={styles.vitalInput} />
          <Input label="HR" placeholder="72" value={heartRate} onChangeText={setHeartRate} keyboardType="numeric" containerStyle={styles.vitalInput} />
        </View>
        <View style={styles.vitalsRow}>
          <Input label="SpO2" placeholder="98" value={spO2} onChangeText={setSpO2} keyboardType="numeric" containerStyle={styles.vitalInput} />
          <Input label="Temp" placeholder="98.6" value={temperature} onChangeText={setTemperature} keyboardType="decimal-pad" containerStyle={styles.vitalInput} />
          <Input label="RR" placeholder="16" value={respiratoryRate} onChangeText={setRespiratoryRate} keyboardType="numeric" containerStyle={styles.vitalInput} />
        </View>
        <View style={styles.vitalsRow}>
          <Input label="Pain (0-10)" placeholder="0" value={painScore} onChangeText={setPainScore} keyboardType="numeric" containerStyle={styles.vitalInput} />
          <View style={styles.vitalInput} />
          <View style={styles.vitalInput} />
        </View>

        <Button title="Submit Triage" onPress={handleSubmit} loading={submitting} style={{ marginTop: 8, marginBottom: 16 }} />
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
  list: {
    padding: 16,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardName: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  cardComplaint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 4,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  levelText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
  },
  cardTime: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 4,
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
  formLabel: {
    ...typography.label,
    color: colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  levelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  levelChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
  },
  levelChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  vitalsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  vitalInput: {
    flex: 1,
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
  selectedPatient: {
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
});
