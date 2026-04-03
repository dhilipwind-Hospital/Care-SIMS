import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme';
import { Header, Button, Input, EmptyState } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Doctor {
  id: string;
  name: string;
  specialization?: string;
  department?: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

type Step = 'doctor' | 'date' | 'slot' | 'confirm' | 'success';

export default function BookAppointmentScreen() {
  const navigation = useNavigation();

  const [step, setStep] = useState<Step>('doctor');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const { data } = await api.get('/doctors', { params: { limit: 50 } });
      const list = Array.isArray(data) ? data : data.data ?? data.doctors ?? [];
      setDoctors(list);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load doctors' });
    } finally {
      setLoadingDoctors(false);
    }
  };

  const fetchSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const { data } = await api.get('/appointments/slots', {
        params: { doctorId: selectedDoctor.id, date: selectedDate },
      });
      const list = Array.isArray(data) ? data : data.data ?? data.slots ?? [];
      setSlots(list);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load slots' });
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    if (step === 'slot' && selectedDoctor && selectedDate) {
      fetchSlots();
    }
  }, [step]);

  const handleBook = async () => {
    if (!selectedDoctor || !selectedDate || !selectedSlot) return;
    setBooking(true);
    try {
      await api.post('/appointments', {
        doctorId: selectedDoctor.id,
        date: selectedDate,
        time: selectedSlot,
        notes: notes.trim() || undefined,
      });
      setStep('success');
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Booking failed' });
    } finally {
      setBooking(false);
    }
  };

  const filteredDoctors = doctorSearch.trim()
    ? doctors.filter((d) =>
        d.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
        d.specialization?.toLowerCase().includes(doctorSearch.toLowerCase()),
      )
    : doctors;

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const stepTitle = {
    doctor: 'Select Doctor',
    date: 'Select Date',
    slot: 'Select Time',
    confirm: 'Confirm Booking',
    success: 'Booking Confirmed',
  };

  // Step 1: Doctor selection
  const renderDoctorStep = () => (
    <>
      <View style={styles.searchWrap}>
        <Input
          placeholder="Search doctors..."
          value={doctorSearch}
          onChangeText={setDoctorSearch}
          leftIcon={<Ionicons name="search" size={18} color={colors.textTertiary} />}
        />
      </View>
      {loadingDoctors ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredDoctors}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.doctorCard, selectedDoctor?.id === item.id && styles.doctorCardSelected]}
              activeOpacity={0.7}
              onPress={() => {
                setSelectedDoctor(item);
                setStep('date');
              }}
            >
              <View style={styles.doctorAvatar}>
                <Ionicons name="person" size={22} color={colors.primary} />
              </View>
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{item.name}</Text>
                {item.specialization && <Text style={styles.doctorSpec}>{item.specialization}</Text>}
                {item.department && <Text style={styles.doctorDept}>{item.department}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
          contentContainerStyle={filteredDoctors.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={<EmptyState icon="search-outline" title="No doctors found" />}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </>
  );

  // Step 2: Date selection
  const renderDateStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepLabel}>Selected Doctor</Text>
      <Text style={styles.stepValue}>{selectedDoctor?.name}</Text>

      <Text style={[styles.stepLabel, { marginTop: spacing.lg }]}>Select Date</Text>
      <Input
        placeholder="YYYY-MM-DD"
        value={selectedDate}
        onChangeText={setSelectedDate}
        keyboardType="default"
        leftIcon={<Ionicons name="calendar-outline" size={18} color={colors.textTertiary} />}
      />
      <Text style={styles.hint}>Enter date in YYYY-MM-DD format (e.g., {getTodayStr()})</Text>

      <Button
        title="Find Available Slots"
        onPress={() => {
          if (!selectedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            Toast.show({ type: 'error', text1: 'Please enter a valid date (YYYY-MM-DD)' });
            return;
          }
          setStep('slot');
        }}
        disabled={!selectedDate}
        style={styles.nextBtn}
      />
    </View>
  );

  // Step 3: Slot selection
  const renderSlotStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepLabel}>{selectedDoctor?.name} | {selectedDate}</Text>

      {loadingSlots ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : slots.length === 0 ? (
        <EmptyState icon="time-outline" title="No available slots" subtitle="Try a different date" />
      ) : (
        <>
          <Text style={[styles.stepLabel, { marginTop: spacing.md }]}>Available Times</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slotsScroll}>
            <View style={styles.slotsRow}>
              {slots.map((slot) => (
                <TouchableOpacity
                  key={slot.time}
                  style={[
                    styles.slotChip,
                    !slot.available && styles.slotDisabled,
                    selectedSlot === slot.time && styles.slotSelected,
                  ]}
                  disabled={!slot.available}
                  onPress={() => setSelectedSlot(slot.time)}
                >
                  <Text
                    style={[
                      styles.slotText,
                      !slot.available && styles.slotTextDisabled,
                      selectedSlot === slot.time && styles.slotTextSelected,
                    ]}
                  >
                    {slot.time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Button
            title="Continue"
            onPress={() => setStep('confirm')}
            disabled={!selectedSlot}
            style={styles.nextBtn}
          />
        </>
      )}
    </View>
  );

  // Step 4: Confirm
  const renderConfirmStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Appointment Summary</Text>
        <View style={styles.summaryRow}>
          <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.summaryText}>{selectedDoctor?.name}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.summaryText}>{selectedDate}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.summaryText}>{selectedSlot}</Text>
        </View>
      </View>

      <Input
        label="Notes (optional)"
        placeholder="Any notes for the doctor..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        style={{ minHeight: 80, textAlignVertical: 'top' }}
      />

      <Button
        title="Confirm Booking"
        onPress={handleBook}
        loading={booking}
        style={styles.nextBtn}
      />
    </View>
  );

  // Step 5: Success
  const renderSuccessStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={80} color={colors.success} />
      </View>
      <Text style={styles.successTitle}>Appointment Booked!</Text>
      <Text style={styles.successSubtitle}>
        Your appointment with {selectedDoctor?.name} on {selectedDate} at {selectedSlot} has been confirmed.
      </Text>
      <Button
        title="Done"
        onPress={() => navigation.goBack()}
        style={styles.nextBtn}
      />
    </View>
  );

  const canGoBack = step !== 'doctor' && step !== 'success';
  const goBack = () => {
    if (step === 'date') setStep('doctor');
    else if (step === 'slot') setStep('date');
    else if (step === 'confirm') setStep('slot');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header
        title={stepTitle[step]}
        onBack={canGoBack ? goBack : () => navigation.goBack()}
      />
      {step === 'doctor' && renderDoctorStep()}
      {step === 'date' && <ScrollView>{renderDateStep()}</ScrollView>}
      {step === 'slot' && <ScrollView>{renderSlotStep()}</ScrollView>}
      {step === 'confirm' && <ScrollView>{renderConfirmStep()}</ScrollView>}
      {step === 'success' && renderSuccessStep()}
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchWrap: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
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
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  doctorCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  doctorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  doctorSpec: {
    ...typography.bodySmall,
    color: colors.primary,
    marginTop: 2,
  },
  doctorDept: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 1,
  },
  stepContent: {
    padding: spacing.base,
  },
  stepLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  stepValue: {
    ...typography.h4,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: -8,
    marginBottom: spacing.md,
  },
  nextBtn: {
    marginTop: spacing.lg,
  },
  slotsScroll: {
    marginVertical: spacing.md,
  },
  slotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  slotSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  slotDisabled: {
    backgroundColor: colors.borderLight,
    opacity: 0.5,
  },
  slotText: {
    ...typography.label,
    color: colors.text,
  },
  slotTextSelected: {
    color: colors.white,
  },
  slotTextDisabled: {
    color: colors.textTertiary,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.lg,
    ...shadow.sm,
  },
  summaryTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryText: {
    ...typography.body,
    color: colors.text,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  successIcon: {
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
