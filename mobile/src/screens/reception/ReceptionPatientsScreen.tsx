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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography, fontSize, fontWeight } from '../../theme/typography';
import { borderRadius, shadow } from '../../theme';
import { PatientCard, EmptyState, Button, Input, BottomSheet } from '../../components';
import api from '../../lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Patient {
  id: string;
  patientId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  gender?: string;
  phone?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ReceptionPatientsScreen({ navigation }: { navigation?: any }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Register form
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [dob, setDob] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPatients = useCallback(async (q?: string) => {
    try {
      const params: Record<string, any> = { page: 1, limit: 20 };
      if (q && q.length >= 2) params.q = q;
      const { data } = await api.get('/patients', { params });
      const list = Array.isArray(data) ? data : data.data ?? data.items ?? [];
      setPatients(list);
    } catch {
      setError('Failed to load patients');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  /* Debounced search */
  useEffect(() => {
    if (search.length === 0) {
      fetchPatients();
      return;
    }
    if (search.length < 2) return;
    const timer = setTimeout(() => fetchPatients(search), 400);
    return () => clearTimeout(timer);
  }, [search, fetchPatients]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPatients(search.length >= 2 ? search : undefined);
  }, [fetchPatients, search]);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setPhone('');
    setGender('MALE');
    setDob('');
  };

  const handleRegister = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Validation', 'First name and last name are required');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Validation', 'Phone number is required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/patients', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        gender,
        dateOfBirth: dob.trim() || undefined,
      });
      setShowForm(false);
      resetForm();
      fetchPatients();
      Alert.alert('Success', 'Patient registered successfully');
    } catch {
      Alert.alert('Error', 'Failed to register patient');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePatientPress = (patient: Patient) => {
    if (navigation) {
      navigation.navigate('PatientSummary', { patientId: patient.id });
    }
  };

  const renderItem = ({ item }: { item: Patient }) => {
    const name = item.name ?? `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim();
    return (
      <PatientCard
        name={name}
        patientId={item.patientId}
        age={item.age}
        gender={item.gender}
        phone={item.phone}
        onPress={() => handlePatientPress(item)}
      />
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
          <TouchableOpacity onPress={() => { setError(null); setLoading(true); fetchPatients(); }} style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#0F766E', borderRadius: 8 }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="Search patients..."
              value={search}
              onChangeText={setSearch}
              leftIcon={<Ionicons name="search-outline" size={18} color={colors.textTertiary} />}
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
          <TouchableOpacity
            style={styles.scanBtn}
            accessibilityLabel="Scan patient barcode"
            onPress={() => {
              navigation?.navigate('Scanner', {
                onScan: (data: string) => setSearch(data),
              });
            }}
          >
            <Ionicons name="scan" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={patients}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={patients.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState icon="people-outline" title="No patients found" subtitle="Try a different search or register a new patient" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)} activeOpacity={0.8}>
        <Ionicons name="person-add-outline" size={24} color={colors.white} />
      </TouchableOpacity>

      {/* Register Modal */}
      <BottomSheet visible={showForm} onClose={() => { setShowForm(false); resetForm(); }} title="Register New Patient">
        <Input label="First Name" placeholder="John" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <Input label="Last Name" placeholder="Doe" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        <Input label="Phone" placeholder="+91 9876543210" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <Text style={styles.formLabel}>Gender</Text>
        <View style={styles.genderRow}>
          {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => {
            const active = gender === g;
            return (
              <TouchableOpacity
                key={g}
                style={[styles.genderChip, active && styles.genderChipActive]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.genderText, active && styles.genderTextActive]}>{g}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Input label="Date of Birth" placeholder="YYYY-MM-DD" value={dob} onChangeText={setDob} keyboardType="numbers-and-punctuation" />

        <Button title="Register Patient" onPress={handleRegister} loading={submitting} style={{ marginTop: 4, marginBottom: 16 }} />
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
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: 16,
  },
  emptyContainer: {
    flexGrow: 1,
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
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  genderChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.base,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  genderChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  genderText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  genderTextActive: {
    color: colors.white,
  },
});
