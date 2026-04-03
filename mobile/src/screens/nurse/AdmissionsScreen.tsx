import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography, fontSize, fontWeight } from '../../theme/typography';
import { borderRadius, shadow } from '../../theme';
import { StatusBadge, getStatusVariant, EmptyState, Button } from '../../components';
import api from '../../lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Admission {
  id: string;
  patient?: { id: string; name: string };
  patientName?: string;
  ward?: { name: string };
  wardName?: string;
  bed?: { bedNumber: string };
  bedNumber?: string;
  admissionDate: string;
  status: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdmissionsScreen() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dischargingId, setDischargingId] = useState<string | null>(null);

  const fetchAdmissions = useCallback(async () => {
    try {
      const { data } = await api.get('/admissions', { params: { page: 1, limit: 20 } });
      const list = Array.isArray(data) ? data : data.data ?? data.items ?? [];
      setAdmissions(list);
    } catch {
      Alert.alert('Error', 'Failed to load admissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmissions();
  }, [fetchAdmissions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAdmissions();
  }, [fetchAdmissions]);

  const handleDischarge = (admission: Admission) => {
    const name = admission.patient?.name ?? admission.patientName ?? 'this patient';
    Alert.alert(
      'Confirm Discharge',
      `Are you sure you want to discharge ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discharge',
          style: 'destructive',
          onPress: async () => {
            setDischargingId(admission.id);
            try {
              await api.patch(`/admissions/${admission.id}/discharge`);
              fetchAdmissions();
            } catch {
              Alert.alert('Error', 'Failed to discharge patient');
            } finally {
              setDischargingId(null);
            }
          },
        },
      ],
    );
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderItem = ({ item }: { item: Admission }) => {
    const name = item.patient?.name ?? item.patientName ?? 'Unknown';
    const ward = item.ward?.name ?? item.wardName ?? '--';
    const bed = item.bed?.bedNumber ?? item.bedNumber ?? '--';
    const isActive = item.status?.toUpperCase() === 'ACTIVE';

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={[styles.card, shadow.sm]}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.detail}>
              Ward: {ward}  |  Bed: {bed}
            </Text>
            <Text style={styles.date}>Admitted: {formatDate(item.admissionDate)}</Text>
          </View>
          <StatusBadge label={item.status} variant={getStatusVariant(item.status)} />
        </View>
        {isActive && (
          <Button
            title="Discharge"
            variant="danger"
            size="sm"
            loading={dischargingId === item.id}
            onPress={() => handleDischarge(item)}
            style={styles.dischargeBtn}
          />
        )}
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <FlatList
        data={admissions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={admissions.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={<EmptyState icon="medical-outline" title="No admissions" subtitle="Active admissions will appear here" />}
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
    marginTop: 4,
  },
  date: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  dischargeBtn: {
    marginTop: 10,
    alignSelf: 'flex-end',
  },
});
