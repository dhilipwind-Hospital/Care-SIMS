import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography, fontSize, fontWeight } from '../../theme/typography';
import { borderRadius, shadow } from '../../theme';
import { Button, Input, PatientCard } from '../../components';
import api from '../../lib/api';
import { offlinePost } from '../../lib/offlineApi';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PatientResult {
  id: string;
  name: string;
  patientId: string;
  age?: number;
  gender?: string;
  phone?: string;
}

interface VitalRecord {
  id: string;
  bpSystolic?: number;
  bpDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  spO2?: number;
  weight?: number;
  painScore?: number;
  bloodGlucose?: number;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function VitalsScreen() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);

  // Vitals form
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [spO2, setSpO2] = useState('');
  const [weight, setWeight] = useState('');
  const [painScore, setPainScore] = useState('');
  const [bloodGlucose, setBloodGlucose] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // History
  const [history, setHistory] = useState<VitalRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  /* Debounced patient search */
  useEffect(() => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get('/patients', { params: { q: query } });
        const list = Array.isArray(data) ? data : data.data ?? data.items ?? [];
        setSearchResults(list.slice(0, 8));
      } catch {
        /* ignore */
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const selectPatient = (p: PatientResult) => {
    setSelectedPatient(p);
    setSearchResults([]);
    setQuery('');
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setHistory([]);
    resetForm();
  };

  const resetForm = () => {
    setSystolic('');
    setDiastolic('');
    setHeartRate('');
    setRespiratoryRate('');
    setTemperature('');
    setSpO2('');
    setWeight('');
    setPainScore('');
    setBloodGlucose('');
  };

  const fetchHistory = useCallback(async (patientId: string) => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get(`/vitals/patient/${patientId}`);
      const list = Array.isArray(data) ? data : data.data ?? data.items ?? [];
      setHistory(list.slice(0, 5));
    } catch {
      /* ignore */
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const handleSubmit = async () => {
    if (!selectedPatient) return;
    if (!systolic && !heartRate && !temperature) {
      Alert.alert('Validation', 'Please enter at least one vital sign');
      return;
    }
    setSubmitting(true);
    try {
      const result = await offlinePost('/vitals', {
        patientId: selectedPatient.id,
        bpSystolic: systolic ? Number(systolic) : undefined,
        bpDiastolic: diastolic ? Number(diastolic) : undefined,
        heartRate: heartRate ? Number(heartRate) : undefined,
        respiratoryRate: respiratoryRate ? Number(respiratoryRate) : undefined,
        temperature: temperature ? Number(temperature) : undefined,
        spO2: spO2 ? Number(spO2) : undefined,
        weight: weight ? Number(weight) : undefined,
        painScore: painScore ? Number(painScore) : undefined,
        bloodGlucose: bloodGlucose ? Number(bloodGlucose) : undefined,
      });
      if (result._offline) {
        Toast.show({
          type: 'info',
          text1: 'Saved offline',
          text2: 'Vitals will sync when connection returns',
        });
      } else {
        Toast.show({ type: 'success', text1: 'Vitals recorded successfully' });
      }
      resetForm();
      fetchHistory(selectedPatient.id);
    } catch {
      Alert.alert('Error', 'Failed to save vitals');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString([], { day: '2-digit', month: 'short' }) +
      ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Patient Search */}
        {!selectedPatient ? (
          <View>
            <Input
              label="Search Patient"
              placeholder="Enter patient name or ID..."
              value={query}
              onChangeText={setQuery}
              leftIcon={<Ionicons name="search-outline" size={18} color={colors.textTertiary} />}
            />
            {searching && <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 8 }} />}
            {searchResults.map((p) => (
              <PatientCard
                key={p.id}
                name={p.name}
                patientId={p.patientId}
                age={p.age}
                gender={p.gender}
                phone={p.phone}
                onPress={() => selectPatient(p)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.selectedSection}>
            <PatientCard
              name={selectedPatient.name}
              patientId={selectedPatient.patientId}
              age={selectedPatient.age}
              gender={selectedPatient.gender}
              phone={selectedPatient.phone}
              rightContent={
                <Button title="Change" variant="ghost" size="sm" onPress={clearPatient} />
              }
            />
          </View>
        )}

        {/* Vitals Form */}
        {selectedPatient && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Record Vitals</Text>

            <View style={styles.row}>
              <Input label="Systolic BP" placeholder="120" value={systolic} onChangeText={setSystolic} keyboardType="numeric" containerStyle={styles.halfInput} style={styles.largeInput} />
              <Input label="Diastolic BP" placeholder="80" value={diastolic} onChangeText={setDiastolic} keyboardType="numeric" containerStyle={styles.halfInput} style={styles.largeInput} />
            </View>

            <View style={styles.row}>
              <Input label="Heart Rate" placeholder="72" value={heartRate} onChangeText={setHeartRate} keyboardType="numeric" containerStyle={styles.halfInput} style={styles.largeInput} />
              <Input label="Respiratory Rate" placeholder="16" value={respiratoryRate} onChangeText={setRespiratoryRate} keyboardType="numeric" containerStyle={styles.halfInput} style={styles.largeInput} />
            </View>

            <View style={styles.row}>
              <Input label="Temperature (F)" placeholder="98.6" value={temperature} onChangeText={setTemperature} keyboardType="decimal-pad" containerStyle={styles.halfInput} style={styles.largeInput} />
              <Input label="SpO2 (%)" placeholder="98" value={spO2} onChangeText={setSpO2} keyboardType="numeric" containerStyle={styles.halfInput} style={styles.largeInput} />
            </View>

            <View style={styles.row}>
              <Input label="Weight (kg)" placeholder="70" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" containerStyle={styles.halfInput} style={styles.largeInput} />
              <Input label="Pain Score (0-10)" placeholder="0" value={painScore} onChangeText={setPainScore} keyboardType="numeric" containerStyle={styles.halfInput} style={styles.largeInput} />
            </View>

            <Input label="Blood Glucose (mg/dL)" placeholder="100" value={bloodGlucose} onChangeText={setBloodGlucose} keyboardType="numeric" style={styles.largeInput} />

            <Button title="Save Vitals" onPress={handleSubmit} loading={submitting} style={{ marginTop: 4 }} />
          </View>
        )}

        {/* History */}
        {selectedPatient && history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Recent Vitals</Text>
            {historyLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              history.map((v) => (
                <View key={v.id} style={[styles.historyCard, shadow.sm]}>
                  <Text style={styles.historyDate}>{formatDate(v.createdAt)}</Text>
                  <View style={styles.historyGrid}>
                    {v.bpSystolic != null && (
                      <Text style={styles.historyItem}>BP: {v.bpSystolic}/{v.bpDiastolic ?? '--'}</Text>
                    )}
                    {v.heartRate != null && <Text style={styles.historyItem}>HR: {v.heartRate}</Text>}
                    {v.spO2 != null && <Text style={styles.historyItem}>SpO2: {v.spO2}%</Text>}
                    {v.temperature != null && <Text style={styles.historyItem}>Temp: {v.temperature}F</Text>}
                    {v.respiratoryRate != null && <Text style={styles.historyItem}>RR: {v.respiratoryRate}</Text>}
                    {v.weight != null && <Text style={styles.historyItem}>Wt: {v.weight}kg</Text>}
                    {v.painScore != null && <Text style={styles.historyItem}>Pain: {v.painScore}/10</Text>}
                    {v.bloodGlucose != null && <Text style={styles.historyItem}>BG: {v.bloodGlucose}</Text>}
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  selectedSection: {
    marginBottom: 8,
  },
  formSection: {
    marginTop: 8,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  largeInput: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  historySection: {
    marginTop: 24,
  },
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 8,
  },
  historyDate: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: 6,
  },
  historyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyItem: {
    ...typography.bodySmall,
    color: colors.text,
    backgroundColor: colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
});
