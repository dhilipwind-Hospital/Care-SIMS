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
import { typography, fontSize, fontWeight } from '../../theme/typography';
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

interface Vehicle {
  id: string;
  vehicleNumber?: string;
  registrationNumber?: string;
  driverName?: string;
  status?: string; // AVAILABLE | ON_TRIP | MAINTENANCE
  type?: string;
}

interface Trip {
  id: string;
  tripNumber?: string;
  patientName?: string;
  pickupLocation?: string;
  destination?: string;
  urgency?: string; // NORMAL | URGENT | EMERGENCY
  status?: string;
  vehicleId?: string;
  vehicle?: Vehicle;
  contactPhone?: string;
  createdAt?: string;
}

const URGENCIES = ['NORMAL', 'URGENT', 'EMERGENCY'] as const;
type Urgency = (typeof URGENCIES)[number];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AmbulanceScreen() {
  const [tab, setTab] = useState<'TRIPS' | 'VEHICLES'>('TRIPS');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  // Dispatch form
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [urgency, setUrgency] = useState<Urgency>('NORMAL');
  const [contactPhone, setContactPhone] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [tripsRes, vehiclesRes] = await Promise.all([
        api.get('/ambulance/trips'),
        api.get('/ambulance/vehicles'),
      ]);
      setTrips(parseList<Trip>(tripsRes.data, 'trips'));
      setVehicles(parseList<Vehicle>(vehiclesRes.data, 'vehicles'));
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err?.response?.data?.message ?? 'Failed to load ambulance data',
      });
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

  const resetForm = () => {
    setSelectedVehicle(null);
    setShowVehiclePicker(false);
    setPatientName('');
    setPickup('');
    setDestination('');
    setUrgency('NORMAL');
    setContactPhone('');
  };

  const handleDispatch = async () => {
    if (!selectedVehicle) {
      Alert.alert('Validation', 'Please select a vehicle');
      return;
    }
    if (!patientName.trim() || !pickup.trim() || !destination.trim()) {
      Alert.alert('Validation', 'Patient, pickup and destination are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/ambulance/trips', {
        vehicleId: selectedVehicle.id,
        patientName: patientName.trim(),
        pickupLocation: pickup.trim(),
        destination: destination.trim(),
        urgency,
        contactPhone: contactPhone.trim() || undefined,
      });
      Toast.show({ type: 'success', text1: 'Ambulance dispatched' });
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err?.response?.data?.message ?? 'Failed to dispatch',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTripAction = async (
    trip: Trip,
    action: 'arrive' | 'depart' | 'complete',
  ) => {
    setActioningId(trip.id);
    try {
      await api.patch(`/ambulance/trips/${trip.id}/${action}`);
      Toast.show({ type: 'success', text1: `Trip ${action}` });
      fetchData();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err?.response?.data?.message ?? `Failed to ${action} trip`,
      });
    } finally {
      setActioningId(null);
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
  const activeTrips = trips.filter((t) => {
    const s = t.status?.toUpperCase();
    return s && s !== 'COMPLETED' && s !== 'CANCELLED';
  }).length;
  const todayTrips = trips.filter((t) => isToday(t.createdAt)).length;
  const completedTrips = trips.filter((t) => t.status?.toUpperCase() === 'COMPLETED').length;

  const renderTrip = ({ item }: { item: Trip }) => {
    const status = item.status?.toUpperCase() ?? '';
    const urg = item.urgency?.toUpperCase() ?? '';
    const isEmergency = urg === 'EMERGENCY';
    const isUrgent = urg === 'URGENT';

    let nextAction: 'arrive' | 'depart' | 'complete' | null = null;
    let nextLabel = '';
    if (status === 'DISPATCHED' || status === 'EN_ROUTE') {
      nextAction = 'arrive';
      nextLabel = 'Arrived';
    } else if (status === 'ARRIVED') {
      nextAction = 'depart';
      nextLabel = 'Depart';
    } else if (status === 'DEPARTED' || status === 'IN_TRANSIT') {
      nextAction = 'complete';
      nextLabel = 'Complete';
    }

    return (
      <View
        style={[
          styles.card,
          shadow.sm,
          isEmergency && styles.emergencyCard,
        ]}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.tripNumber}>#{item.tripNumber ?? item.id.slice(0, 6)}</Text>
            <Text style={styles.name}>{item.patientName ?? 'Unknown patient'}</Text>
            <Text style={styles.detail}>
              {item.pickupLocation ?? '--'} → {item.destination ?? '--'}
            </Text>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.urgencyBadge,
                  {
                    backgroundColor:
                      (isEmergency ? colors.danger : isUrgent ? colors.warning : colors.info) +
                      '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.urgencyText,
                    {
                      color: isEmergency
                        ? colors.danger
                        : isUrgent
                        ? colors.warning
                        : colors.info,
                    },
                  ]}
                >
                  {urg || 'NORMAL'}
                </Text>
              </View>
            </View>
          </View>
          <StatusBadge label={item.status ?? '--'} variant={getStatusVariant(item.status ?? '')} />
        </View>
        {nextAction && (
          <Button
            title={nextLabel}
            size="sm"
            loading={actioningId === item.id}
            onPress={() => handleTripAction(item, nextAction!)}
            style={styles.actionBtn}
          />
        )}
      </View>
    );
  };

  const renderVehicle = ({ item }: { item: Vehicle }) => {
    const status = item.status?.toUpperCase() ?? 'UNKNOWN';
    return (
      <View style={[styles.card, shadow.sm]}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>
              {item.vehicleNumber ?? item.registrationNumber ?? 'Vehicle'}
            </Text>
            {item.registrationNumber && item.vehicleNumber ? (
              <Text style={styles.detail}>Reg: {item.registrationNumber}</Text>
            ) : null}
            {item.driverName ? (
              <Text style={styles.detail}>Driver: {item.driverName}</Text>
            ) : null}
            {item.type ? <Text style={styles.detail}>Type: {item.type}</Text> : null}
          </View>
          <StatusBadge label={status} variant={getStatusVariant(status)} />
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

  const availableVehicles = vehicles.filter(
    (v) => (v.status ?? '').toUpperCase() === 'AVAILABLE',
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['TRIPS', 'VEHICLES'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'TRIPS' ? (
          <>
            <View style={styles.kpiRow}>
              <KpiCard label="Active" value={activeTrips} color={colors.primary} />
              <KpiCard label="Today" value={todayTrips} color={colors.info} />
              <KpiCard label="Done" value={completedTrips} color={colors.success} />
            </View>
            <FlatList
              data={trips}
              keyExtractor={(item) => item.id}
              renderItem={renderTrip}
              contentContainerStyle={trips.length === 0 ? styles.emptyContainer : styles.list}
              ListEmptyComponent={
                <EmptyState
                  icon="medical-outline"
                  title="No trips"
                  subtitle="Dispatch an ambulance to begin"
                />
              }
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
            />
          </>
        ) : (
          <FlatList
            data={vehicles}
            keyExtractor={(item) => item.id}
            renderItem={renderVehicle}
            contentContainerStyle={vehicles.length === 0 ? styles.emptyContainer : styles.list}
            ListEmptyComponent={
              <EmptyState
                icon="car-outline"
                title="No vehicles"
                subtitle="Vehicles will appear here"
              />
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          />
        )}

        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="medical-outline" size={24} color={colors.white} />
        </TouchableOpacity>

        <BottomSheet
          visible={showModal}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
          title="Dispatch Ambulance"
        >
          <Text style={styles.formLabel}>Vehicle *</Text>
          {!selectedVehicle ? (
            <>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setShowVehiclePicker(!showVehiclePicker)}
              >
                <Text style={styles.pickerText}>
                  {availableVehicles.length === 0
                    ? 'No available vehicles'
                    : 'Select a vehicle...'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
              {showVehiclePicker &&
                availableVehicles.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={styles.searchResult}
                    onPress={() => {
                      setSelectedVehicle(v);
                      setShowVehiclePicker(false);
                    }}
                  >
                    <Text style={styles.searchName}>
                      {v.vehicleNumber ?? v.registrationNumber ?? 'Vehicle'}
                    </Text>
                    {v.driverName ? (
                      <Text style={styles.searchId}>{v.driverName}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
            </>
          ) : (
            <View style={styles.selectedRow}>
              <Text style={styles.selectedName}>
                {selectedVehicle.vehicleNumber ??
                  selectedVehicle.registrationNumber ??
                  'Vehicle'}
              </Text>
              <TouchableOpacity onPress={() => setSelectedVehicle(null)}>
                <Ionicons name="close-circle" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}

          <Input
            label="Patient Name *"
            placeholder="Patient full name"
            value={patientName}
            onChangeText={setPatientName}
          />
          <Input
            label="Pickup Location *"
            placeholder="Pickup address"
            value={pickup}
            onChangeText={setPickup}
          />
          <Input
            label="Destination *"
            placeholder="Destination address"
            value={destination}
            onChangeText={setDestination}
          />
          <Input
            label="Contact Phone"
            placeholder="Phone number"
            keyboardType="phone-pad"
            value={contactPhone}
            onChangeText={setContactPhone}
          />

          <Text style={styles.formLabel}>Urgency</Text>
          <View style={styles.urgencyRow}>
            {URGENCIES.map((u) => {
              const active = urgency === u;
              const c =
                u === 'EMERGENCY' ? colors.danger : u === 'URGENT' ? colors.warning : colors.primary;
              return (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.urgencyChip,
                    { borderColor: c },
                    active && { backgroundColor: c },
                  ]}
                  onPress={() => setUrgency(u)}
                >
                  <Text style={[styles.chipText, { color: active ? colors.white : c }]}>{u}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Button
            title="Dispatch"
            onPress={handleDispatch}
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: borderRadius.base,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
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
  emergencyCard: {
    borderWidth: 2,
    borderColor: colors.danger,
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
  tripNumber: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: 2,
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
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  urgencyText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
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
    marginBottom: 8,
  },
  pickerText: {
    ...typography.body,
    color: colors.textTertiary,
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
  urgencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  urgencyChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.base,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
