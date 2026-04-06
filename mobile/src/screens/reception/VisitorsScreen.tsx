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
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography, fontWeight } from '../../theme/typography';
import { borderRadius, shadow } from '../../theme';
import {
  KpiCard,
  StatusBadge,
  getStatusVariant,
  EmptyState,
  Button,
  Input,
  BottomSheet,
} from '../../components';
import api from '../../lib/api';
import { parseList } from '../../lib/parseResponse';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Visitor {
  id: string;
  visitorName: string;
  relationship?: string;
  phone?: string;
  patient?: { id: string; name: string };
  patientName?: string;
  purpose?: string;
  status: string; // CHECKED_IN | CHECKED_OUT
  checkInTime?: string;
  checkOutTime?: string;
  createdAt?: string;
}

interface PatientResult {
  id: string;
  name: string;
  patientId?: string;
}

const ID_TYPES = ['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'OTHER'] as const;
type IdType = (typeof ID_TYPES)[number];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function VisitorsScreen() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);

  // Form state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');
  const [idType, setIdType] = useState<IdType>('AADHAAR');
  const [idNumber, setIdNumber] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [showIdPicker, setShowIdPicker] = useState(false);

  const fetchVisitors = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/visitors'),
        api.get('/visitors/active-count').catch(() => ({ data: { count: 0 } })),
      ]);
      const list = parseList<Visitor>(listRes.data, 'visitors');
      setVisitors(list);
      const count =
        countRes.data?.count ??
        countRes.data?.activeCount ??
        countRes.data?.data?.count ??
        list.filter((v) => v.status?.toUpperCase() === 'CHECKED_IN').length;
      setActiveCount(count);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err?.response?.data?.message ?? 'Failed to load visitors',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVisitors();
  }, [fetchVisitors]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVisitors();
  }, [fetchVisitors]);

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
        const list = parseList<PatientResult>(data);
        setPatientResults(list.slice(0, 8));
      } catch {
        /* ignore */
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [patientQuery]);

  const resetForm = () => {
    setVisitorName('');
    setPhone('');
    setRelationship('');
    setIdType('AADHAAR');
    setIdNumber('');
    setPurpose('');
    setNotes('');
    setPatientQuery('');
    setPatientResults([]);
    setSelectedPatient(null);
    setShowIdPicker(false);
  };

  const handleCheckIn = async () => {
    if (!visitorName.trim()) {
      Alert.alert('Validation', 'Visitor name is required');
      return;
    }
    if (!selectedPatient) {
      Alert.alert('Validation', 'Please select a patient');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/visitors', {
        visitorName: visitorName.trim(),
        relationship: relationship.trim() || undefined,
        phone: phone.trim() || undefined,
        idType,
        idNumber: idNumber.trim() || undefined,
        patientId: selectedPatient.id,
        purpose: purpose.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      Toast.show({ type: 'success', text1: 'Visitor checked in' });
      setShowModal(false);
      resetForm();
      fetchVisitors();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err?.response?.data?.message ?? 'Failed to check in visitor',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = (visitor: Visitor) => {
    Alert.alert(
      'Check Out Visitor',
      `Check out ${visitor.visitorName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check Out',
          onPress: async () => {
            setCheckingOutId(visitor.id);
            try {
              await api.patch(`/visitors/${visitor.id}/checkout`);
              Toast.show({ type: 'success', text1: 'Visitor checked out' });
              fetchVisitors();
            } catch (err: any) {
              Toast.show({
                type: 'error',
                text1: err?.response?.data?.message ?? 'Failed to check out',
              });
            } finally {
              setCheckingOutId(null);
            }
          },
        },
      ],
    );
  };

  const formatTime = (iso?: string) => {
    if (!iso) return '--';
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--';
    }
  };

  /* Stats */
  const today = new Date();
  const isToday = (iso?: string) => {
    if (!iso) return false;
    const d = new Date(iso);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };
  const todayList = visitors.filter((v) => isToday(v.checkInTime ?? v.createdAt));
  const checkedOutCount = visitors.filter((v) => v.status?.toUpperCase() === 'CHECKED_OUT').length;
  const durations = visitors
    .filter((v) => v.checkInTime && v.checkOutTime)
    .map(
      (v) =>
        (new Date(v.checkOutTime!).getTime() - new Date(v.checkInTime!).getTime()) / 60000,
    );
  const avgDuration =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

  const renderItem = ({ item }: { item: Visitor }) => {
    const patient = item.patient?.name ?? item.patientName ?? '--';
    const isCheckedIn = item.status?.toUpperCase() === 'CHECKED_IN';
    return (
      <View style={[styles.card, shadow.sm]}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{item.visitorName}</Text>
            {item.relationship ? (
              <Text style={styles.detail}>{item.relationship}</Text>
            ) : null}
            <Text style={styles.detail}>Visiting: {patient}</Text>
            <Text style={styles.time}>In: {formatTime(item.checkInTime ?? item.createdAt)}</Text>
          </View>
          <StatusBadge label={item.status} variant={getStatusVariant(item.status)} />
        </View>
        {isCheckedIn && (
          <Button
            title="Check Out"
            variant="danger"
            size="sm"
            loading={checkingOutId === item.id}
            onPress={() => handleCheckOut(item)}
            style={styles.actionBtn}
          />
        )}
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
        <View style={styles.kpiRow}>
          <KpiCard label="Active" value={activeCount} color={colors.primary} />
          <KpiCard label="Today" value={todayList.length} color={colors.info} />
          <KpiCard label="Out" value={checkedOutCount} color={colors.success} />
          <KpiCard label="Avg(m)" value={avgDuration} color={colors.warning} />
        </View>

        <FlatList
          data={visitors}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={visitors.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="person-add-outline"
              title="No visitors yet"
              subtitle="Check in a visitor to get started"
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />

        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add-outline" size={24} color={colors.white} />
        </TouchableOpacity>

        <BottomSheet
          visible={showModal}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
          title="Check In Visitor"
        >
          <Input
            label="Visitor Name *"
            placeholder="Full name"
            value={visitorName}
            onChangeText={setVisitorName}
          />
          <Input
            label="Phone"
            placeholder="Phone number"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <Input
            label="Relationship"
            placeholder="e.g. Brother, Spouse"
            value={relationship}
            onChangeText={setRelationship}
          />

          <Text style={styles.formLabel}>ID Type</Text>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => setShowIdPicker(!showIdPicker)}
          >
            <Text style={styles.pickerValue}>{idType}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          {showIdPicker &&
            ID_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={styles.searchResult}
                onPress={() => {
                  setIdType(t);
                  setShowIdPicker(false);
                }}
              >
                <Text style={styles.searchName}>{t}</Text>
              </TouchableOpacity>
            ))}

          <Input
            label="ID Number"
            placeholder="ID number"
            value={idNumber}
            onChangeText={setIdNumber}
          />

          <Text style={styles.formLabel}>Patient *</Text>
          {!selectedPatient ? (
            <>
              <Input
                placeholder="Search patient name or ID..."
                value={patientQuery}
                onChangeText={setPatientQuery}
                leftIcon={<Ionicons name="search-outline" size={18} color={colors.textTertiary} />}
              />
              {searching && (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 8 }} />
              )}
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
                  {p.patientId ? <Text style={styles.searchId}>{p.patientId}</Text> : null}
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

          <Input
            label="Purpose"
            placeholder="Reason for visit"
            value={purpose}
            onChangeText={setPurpose}
          />
          <Input
            label="Notes"
            placeholder="Additional notes"
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <Button
            title="Check In"
            onPress={handleCheckIn}
            loading={submitting}
            style={{ marginTop: 12, marginBottom: 16 }}
          />
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
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  detail: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  time: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  actionBtn: {
    marginTop: 10,
    alignSelf: 'flex-end',
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
  pickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.base,
    padding: 12,
    marginBottom: 12,
  },
  pickerValue: {
    ...typography.body,
    color: colors.text,
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
});
