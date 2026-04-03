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
import { StatusBadge, getStatusVariant, EmptyState, Input, Button } from '../../components';
import api from '../../lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Doctor {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  specialties?: string[];
  specialization?: string;
  status: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PlatformDoctorsScreen() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctors = useCallback(async (q?: string) => {
    try {
      setError(null);
      const params: Record<string, any> = {};
      if (q && q.length >= 2) params.q = q;
      const { data } = await api.get('/platform/doctors', { params });
      const list = Array.isArray(data) ? data : data.data ?? data.items ?? [];
      setDoctors(list);
    } catch {
      setError('Failed to load doctors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  /* Debounced search */
  useEffect(() => {
    if (search.length === 0) {
      fetchDoctors();
      return;
    }
    if (search.length < 2) return;
    const timer = setTimeout(() => fetchDoctors(search), 400);
    return () => clearTimeout(timer);
  }, [search, fetchDoctors]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDoctors(search.length >= 2 ? search : undefined);
  }, [fetchDoctors, search]);

  const handleVerify = async (doctor: Doctor) => {
    setActionId(doctor.id);
    try {
      await api.patch(`/platform/doctors/${doctor.id}/verify`);
      Alert.alert('Success', `${getDoctorName(doctor)} verified`);
      fetchDoctors(search.length >= 2 ? search : undefined);
    } catch {
      Alert.alert('Error', 'Failed to verify doctor');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = (doctor: Doctor) => {
    Alert.alert('Reject Doctor', `Are you sure you want to reject ${getDoctorName(doctor)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          setActionId(doctor.id);
          try {
            await api.patch(`/platform/doctors/${doctor.id}/reject`);
            Alert.alert('Done', `${getDoctorName(doctor)} rejected`);
            fetchDoctors(search.length >= 2 ? search : undefined);
          } catch {
            Alert.alert('Error', 'Failed to reject doctor');
          } finally {
            setActionId(null);
          }
        },
      },
    ]);
  };

  const getDoctorName = (doc: Doctor): string => {
    return doc.name ?? (`${doc.firstName ?? ''} ${doc.lastName ?? ''}`.trim() || 'Unknown');
  };

  const getSpecialties = (doc: Doctor): string => {
    if (doc.specialties && doc.specialties.length > 0) {
      return doc.specialties.join(', ');
    }
    return doc.specialization ?? 'General';
  };

  const renderItem = ({ item }: { item: Doctor }) => {
    const name = getDoctorName(item);
    const isPending = item.status?.toUpperCase() === 'PENDING';
    const isActioning = actionId === item.id;

    return (
      <View style={[styles.card, shadow.sm]}>
        <View style={styles.cardTop}>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>Dr. {name}</Text>
            <Text style={styles.email}>{item.email}</Text>
            <Text style={styles.specialty}>{getSpecialties(item)}</Text>
          </View>
          <StatusBadge label={item.status} variant={getStatusVariant(item.status)} />
        </View>

        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.verifyBtn]}
              onPress={() => handleVerify(item)}
              disabled={isActioning}
            >
              {isActioning ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.white} />
                  <Text style={styles.actionBtnText}>Verify</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleReject(item)}
              disabled={isActioning}
            >
              <Ionicons name="close-circle-outline" size={16} color={colors.white} />
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
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

  if (error && !loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Ionicons name="cloud-offline-outline" size={48} color="#9CA3AF" />
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 12 }}>{error}</Text>
          <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' }}>Pull down to retry or check your connection</Text>
          <TouchableOpacity onPress={() => { setError(null); setLoading(true); fetchDoctors(); }} style={{ marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#0F766E', borderRadius: 8 }}>
            <Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Doctors</Text>
          <Text style={styles.headerSubtitle}>Verify and manage platform doctors</Text>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Input
            placeholder="Search doctors..."
            value={search}
            onChangeText={setSearch}
            leftIcon={<Ionicons name="search-outline" size={18} color={colors.textTertiary} />}
            containerStyle={{ marginBottom: 0 }}
          />
        </View>

        <FlatList
          data={doctors}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={doctors.length === 0 ? styles.emptyContainer : styles.list}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No doctors found" subtitle="Try a different search" />}
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchWrap: {
    paddingHorizontal: 16,
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
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  email: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  specialty: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: borderRadius.base,
    gap: 6,
  },
  verifyBtn: {
    backgroundColor: colors.success,
  },
  rejectBtn: {
    backgroundColor: colors.danger,
  },
  actionBtnText: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
  },
});
