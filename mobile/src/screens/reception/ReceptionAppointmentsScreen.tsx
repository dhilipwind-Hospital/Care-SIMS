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
import { StatusBadge, getStatusVariant, EmptyState, Button, Input, BottomSheet } from '../../components';
import api from '../../lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Appointment {
  id: string;
  patient?: { id: string; name: string };
  patientName?: string;
  doctor?: { name: string };
  doctorName?: string;
  date: string;
  time?: string;
  status: string;
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

export default function ReceptionAppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Book form
  const [showForm, setShowForm] = useState(false);
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null);
  const [showDoctorPicker, setShowDoctorPicker] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      const { data } = await api.get('/appointments', { params: { page: 1, limit: 20 } });
      const list = Array.isArray(data) ? data : data.data ?? data.items ?? [];
      setAppointments(list);
    } catch {
      setError('Failed to load appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAppointments();
  }, [fetchAppointments]);

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

  /* Fetch doctors */
  useEffect(() => {
    if (showForm && doctors.length === 0) {
      api.get('/doctors').then(({ data }) => {
        const list = Array.isArray(data) ? data : data.data ?? data.items ?? [];
        setDoctors(list.map((d: any) => ({ id: d.id, name: d.name ?? `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() })));
      }).catch(() => {});
    }
  }, [showForm]);

  const resetForm = () => {
    setPatientQuery('');
    setPatientResults([]);
    setSelectedPatient(null);
    setSelectedDoctor(null);
    setShowDoctorPicker(false);
    setDate('');
    setTime('');
  };

  const handleBook = async () => {
    if (!selectedPatient) {
      Alert.alert('Validation', 'Please select a patient');
      return;
    }
    if (!selectedDoctor) {
      Alert.alert('Validation', 'Please select a doctor');
      return;
    }
    if (!date.trim()) {
      Alert.alert('Validation', 'Please enter date');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/appointments', {
        patientId: selectedPatient.id,
        doctorId: selectedDoctor.id,
        date: date.trim(),
        time: time.trim() || undefined,
      });
      setShowForm(false);
      resetForm();
      fetchAppointments();
      Alert.alert('Success', 'Appointment booked');
    } catch {
      Alert.alert('Error', 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = (appt: Appointment) => {
    Alert.alert('Cancel Appointment', 'Are you sure you want to cancel this appointment?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Appointment',
        style: 'destructive',
        onPress: async () => {
          setCancellingId(appt.id);
          try {
            await api.patch(`/appointments/${appt.id}/cancel`);
            fetchAppointments();
          } catch {
            Alert.alert('Error', 'Failed to cancel appointment');
          } finally {
            setCancellingId(null);
          }
        },
      },
    ]);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }: { item: Appointment }) => {
    const patientName = item.patient?.name ?? item.patientName ?? 'Unknown';
    const doctorName = item.doctor?.name ?? item.doctorName ?? '--';
    const isScheduled = item.status?.toUpperCase() === 'SCHEDULED';

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={[styles.card, shadow.sm]}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{patientName}</Text>
            <Text style={styles.doctor}>Dr. {doctorName}</Text>
            <Text style={styles.dateTime}>
              {formatDate(item.date)}{item.time ? `  ${item.time}` : ''}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <StatusBadge label={item.status} variant={getStatusVariant(item.status)} />
            {isScheduled && (
              <Button
                title="Cancel"
                variant="danger"
                size="sm"
                loading={cancellingId === item.id}
                onPress={() => handleCancel(item)}
                style={{ marginTop: 8 }}
              />
            )}
          </View>
        </View>
      </View>
      </SafeAreaView>
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
          <TouchableOpacity onPress={() => { setError(null); setLoading(true); fetchAppointments(); }} style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#0F766E', borderRadius: 8 }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={appointments.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState icon="calendar-outline" title="No appointments" subtitle="Tap + to book an appointment" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Book Appointment Modal */}
      <BottomSheet visible={showForm} onClose={() => { setShowForm(false); resetForm(); }} title="Book Appointment">
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

        <Input label="Date" placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" />
        <Input label="Time" placeholder="HH:MM (24h)" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" />

        <Button title="Book Appointment" onPress={handleBook} loading={submitting} style={{ marginTop: 4, marginBottom: 16 }} />
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
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  cardRight: {
    alignItems: 'flex-end',
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
  dateTime: {
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
});
