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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { typography, fontSize, fontWeight } from '../../theme/typography';
import { borderRadius, shadow } from '../../theme';
import { KpiCard, EmptyState, Button, Input, BottomSheet } from '../../components';
import api from '../../lib/api';
import { parseList, parseObject } from '../../lib/parseResponse';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface IcuBed {
  id: string;
  bedNumber: string;
  status: string; // AVAILABLE | OCCUPIED | MAINTENANCE | RESERVED
  admission?: {
    id: string;
    patient?: { id: string; name: string };
    patientName?: string;
  } | null;
}

interface DashboardStats {
  totalBeds?: number;
  occupied?: number;
  available?: number;
  critical?: number;
}

interface MonitoringRecord {
  id: string;
  recordedAt?: string;
  createdAt?: string;
  vitalSigns?: any;
  ventilatorSettings?: any;
  glasgowComaScale?: number;
  painScore?: number;
  notes?: string;
}

const VENT_MODES = ['CMV', 'SIMV', 'PSV', 'CPAP', 'BiPAP', 'NONE'] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function IcuScreen() {
  const [beds, setBeds] = useState<IcuBed[]>([]);
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Bed action sheet
  const [selectedBed, setSelectedBed] = useState<IcuBed | null>(null);
  const [showBedSheet, setShowBedSheet] = useState(false);

  // Record monitoring sheet
  const [showRecordSheet, setShowRecordSheet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [hr, setHr] = useState('');
  const [spo2, setSpo2] = useState('');
  const [temp, setTemp] = useState('');
  const [rr, setRr] = useState('');
  const [ventMode, setVentMode] = useState<string>('NONE');
  const [showVentPicker, setShowVentPicker] = useState(false);
  const [fio2, setFio2] = useState('');
  const [peep, setPeep] = useState('');
  const [gcs, setGcs] = useState('');
  const [painScore, setPainScore] = useState('');
  const [notes, setNotes] = useState('');

  // History sheet
  const [showHistorySheet, setShowHistorySheet] = useState(false);
  const [history, setHistory] = useState<MonitoringRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [bedsRes, dashRes] = await Promise.all([
        api.get('/icu/beds'),
        api.get('/icu/dashboard').catch(() => ({ data: {} })),
      ]);
      setBeds(parseList<IcuBed>(bedsRes.data, 'beds'));
      const stat = parseObject<DashboardStats>(dashRes.data) ?? {};
      setStats(stat);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err?.response?.data?.message ?? 'Failed to load ICU data',
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

  const resetRecordForm = () => {
    setBpSys('');
    setBpDia('');
    setHr('');
    setSpo2('');
    setTemp('');
    setRr('');
    setVentMode('NONE');
    setShowVentPicker(false);
    setFio2('');
    setPeep('');
    setGcs('');
    setPainScore('');
    setNotes('');
  };

  const openBedActions = (bed: IcuBed) => {
    if (bed.status?.toUpperCase() !== 'OCCUPIED' || !bed.admission) {
      // Allow status update for non-occupied
      Alert.alert(
        bed.bedNumber,
        `Status: ${bed.status}`,
        [{ text: 'OK', style: 'cancel' }],
      );
      return;
    }
    setSelectedBed(bed);
    setShowBedSheet(true);
  };

  const handleRecordMonitoring = async () => {
    if (!selectedBed?.admission?.id) return;
    setSubmitting(true);
    try {
      const vitalSigns: any = {};
      if (bpSys || bpDia)
        vitalSigns.bloodPressure = { systolic: Number(bpSys) || 0, diastolic: Number(bpDia) || 0 };
      if (hr) vitalSigns.heartRate = Number(hr);
      if (spo2) vitalSigns.spo2 = Number(spo2);
      if (temp) vitalSigns.temperature = Number(temp);
      if (rr) vitalSigns.respiratoryRate = Number(rr);

      const ventilatorSettings: any = {};
      if (ventMode && ventMode !== 'NONE') ventilatorSettings.mode = ventMode;
      if (fio2) ventilatorSettings.fio2 = Number(fio2);
      if (peep) ventilatorSettings.peep = Number(peep);

      await api.post('/icu/monitoring', {
        admissionId: selectedBed.admission.id,
        vitalSigns: Object.keys(vitalSigns).length > 0 ? vitalSigns : undefined,
        ventilatorSettings:
          Object.keys(ventilatorSettings).length > 0 ? ventilatorSettings : undefined,
        glasgowComaScale: gcs ? Number(gcs) : undefined,
        painScore: painScore ? Number(painScore) : undefined,
        notes: notes.trim() || undefined,
      });
      Toast.show({ type: 'success', text1: 'Monitoring recorded' });
      setShowRecordSheet(false);
      resetRecordForm();
      fetchData();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err?.response?.data?.message ?? 'Failed to record monitoring',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewHistory = async () => {
    if (!selectedBed?.admission?.id) return;
    setShowBedSheet(false);
    setShowHistorySheet(true);
    setHistoryLoading(true);
    try {
      const { data } = await api.get(
        `/icu/monitoring/admission/${selectedBed.admission.id}`,
      );
      setHistory(parseList<MonitoringRecord>(data));
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: err?.response?.data?.message ?? 'Failed to load history',
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  /* Stats fallbacks */
  const totalBeds = stats.totalBeds ?? beds.length;
  const occupied =
    stats.occupied ?? beds.filter((b) => b.status?.toUpperCase() === 'OCCUPIED').length;
  const available =
    stats.available ?? beds.filter((b) => b.status?.toUpperCase() === 'AVAILABLE').length;
  const critical = stats.critical ?? 0;

  const getBedColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'OCCUPIED':
        return colors.danger;
      case 'AVAILABLE':
        return colors.success;
      case 'MAINTENANCE':
        return colors.warning;
      case 'RESERVED':
        return colors.info;
      default:
        return colors.textTertiary;
    }
  };

  const renderBed = ({ item }: { item: IcuBed }) => {
    const color = getBedColor(item.status);
    const patient = item.admission?.patient?.name ?? item.admission?.patientName;
    return (
      <TouchableOpacity
        style={[styles.bedCard, shadow.sm, { borderTopColor: color }]}
        onPress={() => openBedActions(item)}
        activeOpacity={0.7}
      >
        <View style={styles.bedHeader}>
          <Ionicons name="bed-outline" size={20} color={color} />
          <Text style={styles.bedNumber}>{item.bedNumber}</Text>
        </View>
        <View style={[styles.bedStatusPill, { backgroundColor: color + '20' }]}>
          <Text style={[styles.bedStatusText, { color }]}>{item.status}</Text>
        </View>
        {patient ? (
          <Text style={styles.bedPatient} numberOfLines={1}>
            {patient}
          </Text>
        ) : (
          <Text style={styles.bedEmpty}>Empty</Text>
        )}
      </TouchableOpacity>
    );
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '--';
    try {
      return new Date(iso).toLocaleString([], {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '--';
    }
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
          <KpiCard label="Total" value={totalBeds} color={colors.primary} />
          <KpiCard label="Occupied" value={occupied} color={colors.danger} />
          <KpiCard label="Available" value={available} color={colors.success} />
          <KpiCard label="Critical" value={critical} color={colors.warning} />
        </View>

        <FlatList
          data={beds}
          keyExtractor={(item) => item.id}
          renderItem={renderBed}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={beds.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={
            <EmptyState icon="bed-outline" title="No ICU beds" subtitle="Beds will appear here" />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />

        {/* Bed action sheet */}
        <BottomSheet
          visible={showBedSheet}
          onClose={() => setShowBedSheet(false)}
          title={selectedBed ? `Bed ${selectedBed.bedNumber}` : 'Bed'}
        >
          {selectedBed?.admission && (
            <View style={styles.selectedRow}>
              <Text style={styles.selectedName}>
                {selectedBed.admission.patient?.name ?? selectedBed.admission.patientName ?? 'Patient'}
              </Text>
            </View>
          )}
          <Button
            title="Record Monitoring"
            onPress={() => {
              setShowBedSheet(false);
              setShowRecordSheet(true);
            }}
            style={{ marginBottom: 10 }}
          />
          <Button
            title="View History"
            variant="secondary"
            onPress={handleViewHistory}
            style={{ marginBottom: 16 }}
          />
        </BottomSheet>

        {/* Record monitoring sheet */}
        <BottomSheet
          visible={showRecordSheet}
          onClose={() => {
            setShowRecordSheet(false);
            resetRecordForm();
          }}
          title="Record Monitoring"
        >
          <Text style={styles.sectionTitle}>Vital Signs</Text>
          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label="BP Sys"
                placeholder="120"
                keyboardType="numeric"
                value={bpSys}
                onChangeText={setBpSys}
              />
            </View>
            <View style={styles.half}>
              <Input
                label="BP Dia"
                placeholder="80"
                keyboardType="numeric"
                value={bpDia}
                onChangeText={setBpDia}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label="HR (bpm)"
                placeholder="75"
                keyboardType="numeric"
                value={hr}
                onChangeText={setHr}
              />
            </View>
            <View style={styles.half}>
              <Input
                label="SpO2 (%)"
                placeholder="98"
                keyboardType="numeric"
                value={spo2}
                onChangeText={setSpo2}
              />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label="Temp (°C)"
                placeholder="37.0"
                keyboardType="numeric"
                value={temp}
                onChangeText={setTemp}
              />
            </View>
            <View style={styles.half}>
              <Input
                label="RR"
                placeholder="16"
                keyboardType="numeric"
                value={rr}
                onChangeText={setRr}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Ventilator</Text>
          <Text style={styles.formLabel}>Mode</Text>
          <TouchableOpacity
            style={styles.pickerBtn}
            onPress={() => setShowVentPicker(!showVentPicker)}
          >
            <Text style={styles.pickerValue}>{ventMode}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          {showVentPicker &&
            VENT_MODES.map((m) => (
              <TouchableOpacity
                key={m}
                style={styles.searchResult}
                onPress={() => {
                  setVentMode(m);
                  setShowVentPicker(false);
                }}
              >
                <Text style={styles.searchName}>{m}</Text>
              </TouchableOpacity>
            ))}
          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label="FiO2 (%)"
                placeholder="40"
                keyboardType="numeric"
                value={fio2}
                onChangeText={setFio2}
              />
            </View>
            <View style={styles.half}>
              <Input
                label="PEEP"
                placeholder="5"
                keyboardType="numeric"
                value={peep}
                onChangeText={setPeep}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Assessment</Text>
          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label="GCS (3-15)"
                placeholder="15"
                keyboardType="numeric"
                value={gcs}
                onChangeText={setGcs}
              />
            </View>
            <View style={styles.half}>
              <Input
                label="Pain (0-10)"
                placeholder="0"
                keyboardType="numeric"
                value={painScore}
                onChangeText={setPainScore}
              />
            </View>
          </View>
          <Input
            label="Notes"
            placeholder="Clinical notes"
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <Button
            title="Save"
            onPress={handleRecordMonitoring}
            loading={submitting}
            style={{ marginTop: 12, marginBottom: 16 }}
          />
        </BottomSheet>

        {/* History sheet */}
        <BottomSheet
          visible={showHistorySheet}
          onClose={() => {
            setShowHistorySheet(false);
            setHistory([]);
          }}
          title="Monitoring History"
        >
          {historyLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
          ) : history.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <Ionicons name="document-text-outline" size={36} color={colors.textTertiary} />
              <Text style={{ marginTop: 8, color: colors.textSecondary }}>No records yet</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 400 }}>
              {history.map((rec) => {
                const vs = rec.vitalSigns ?? {};
                const bp = vs.bloodPressure
                  ? `${vs.bloodPressure.systolic}/${vs.bloodPressure.diastolic}`
                  : '--';
                return (
                  <View key={rec.id} style={styles.historyCard}>
                    <Text style={styles.historyTime}>
                      {formatDateTime(rec.recordedAt ?? rec.createdAt)}
                    </Text>
                    <Text style={styles.historyLine}>
                      BP: {bp}  HR: {vs.heartRate ?? '--'}  SpO2: {vs.spo2 ?? '--'}%
                    </Text>
                    <Text style={styles.historyLine}>
                      Temp: {vs.temperature ?? '--'}°C  RR: {vs.respiratoryRate ?? '--'}
                    </Text>
                    {rec.glasgowComaScale != null && (
                      <Text style={styles.historyLine}>
                        GCS: {rec.glasgowComaScale}  Pain: {rec.painScore ?? '--'}
                      </Text>
                    )}
                    {rec.notes ? <Text style={styles.historyNotes}>{rec.notes}</Text> : null}
                  </View>
                );
              })}
            </ScrollView>
          )}
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
    padding: 12,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  bedCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: 12,
    borderTopWidth: 4,
  },
  bedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bedNumber: {
    ...typography.h4,
    color: colors.text,
  },
  bedStatusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 6,
  },
  bedStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  bedPatient: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: fontWeight.semibold,
    marginTop: 8,
  },
  bedEmpty: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  sectionTitle: {
    ...typography.label,
    color: colors.primary,
    marginTop: 8,
    marginBottom: 6,
    fontWeight: fontWeight.bold,
  },
  formLabel: {
    ...typography.label,
    color: colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  half: {
    flex: 1,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchName: {
    ...typography.body,
    color: colors.text,
  },
  selectedRow: {
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
  historyCard: {
    backgroundColor: colors.inputBackground,
    borderRadius: borderRadius.base,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  historyTime: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: 4,
  },
  historyLine: {
    ...typography.bodySmall,
    color: colors.text,
    marginTop: 2,
  },
  historyNotes: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
