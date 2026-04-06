import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
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
import { EmptyState } from '../../components';
import api from '../../lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Bed {
  id: string;
  bedNumber: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
  patient?: { id: string; name: string } | null;
  patientName?: string;
}

interface Ward {
  id: string;
  name: string;
  totalBeds?: number;
  beds?: Bed[];
}

interface SectionData {
  title: string;
  occupied: number;
  available: number;
  total: number;
  data: Bed[][];
}

const BED_COLOR: Record<string, string> = {
  AVAILABLE: colors.success,
  OCCUPIED: colors.danger,
  MAINTENANCE: colors.warning,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function WardsScreen() {
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWards = useCallback(async () => {
    try {
      const { data } = await api.get('/wards');
      const list: Ward[] = Array.isArray(data) ? data : data.data ?? data.items ?? [];

      const mapped: SectionData[] = list.map((ward) => {
        const beds = ward.beds ?? [];
        const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;
        const available = beds.filter((b) => b.status === 'AVAILABLE').length;

        // chunk beds into rows of 3
        const rows: Bed[][] = [];
        for (let i = 0; i < beds.length; i += 3) {
          rows.push(beds.slice(i, i + 3));
        }
        if (rows.length === 0) rows.push([]); // at least one row so section header shows

        return {
          title: ward.name,
          occupied,
          available,
          total: beds.length,
          data: rows,
        };
      });

      setSections(mapped);
    } catch {
      Alert.alert('Error', 'Failed to load wards');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWards();
  }, [fetchWards]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWards();
  }, [fetchWards]);

  const handleBedPress = (bed: Bed) => {
    if (bed.status === 'OCCUPIED') {
      const name = bed.patient?.name ?? bed.patientName ?? 'Unknown patient';
      Alert.alert(`Bed ${bed.bedNumber}`, `Patient: ${name}`);
    } else if (bed.status === 'MAINTENANCE') {
      Alert.alert(`Bed ${bed.bedNumber}`, 'Under maintenance');
    }
  };

  const renderBedRow = ({ item: row }: { item: Bed[] }) => (
    <View style={styles.bedRow}>
      {row.map((bed) => {
        const bg = BED_COLOR[bed.status] ?? colors.textTertiary;
        return (
          <TouchableOpacity
            key={bed.id}
            style={[styles.bedCell, { backgroundColor: bg + '20', borderColor: bg }]}
            onPress={() => handleBedPress(bed)}
            activeOpacity={0.7}
          >
            <View style={[styles.bedDot, { backgroundColor: bg }]} />
            <Text style={[styles.bedNumber, { color: bg }]}>{bed.bedNumber}</Text>
          </TouchableOpacity>
        );
      })}
      {/* fill empty slots for alignment */}
      {Array.from({ length: 3 - row.length }).map((_, i) => (
        <View key={`empty-${i}`} style={styles.bedCellEmpty} />
      ))}
    </View>
  );

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Ionicons name="bed-outline" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      <View style={styles.statsRow}>
        <Text style={[styles.stat, { color: colors.success }]}>
          {section.available} avail
        </Text>
        <Text style={styles.statSep}>|</Text>
        <Text style={[styles.stat, { color: colors.danger }]}>
          {section.occupied} occupied
        </Text>
        <Text style={styles.statSep}>|</Text>
        <Text style={[styles.stat, { color: colors.textSecondary }]}>
          {section.total} total
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
      </SafeAreaView>
    );
  }

  if (sections.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.center}>
        <EmptyState icon="bed-outline" title="No wards found" subtitle="Wards will appear here once configured" />
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
        <SectionList
          sections={sections}
        keyExtractor={(item, index) => `row-${index}`}
        renderItem={renderBedRow}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      />

      {/* Legend */}
      <View style={styles.legend}>
        {[
          { label: 'Available', color: colors.success },
          { label: 'Occupied', color: colors.danger },
          { label: 'Maintenance', color: colors.warning },
        ].map((l) => (
          <View key={l.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: l.color }]} />
            <Text style={styles.legendText}>{l.label}</Text>
          </View>
        ))}
        </View>
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
    paddingBottom: 60,
  },
  sectionHeader: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: 8,
    marginTop: 12,
    ...shadow.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  stat: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  statSep: {
    color: colors.border,
  },
  bedRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  bedCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: borderRadius.base,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bedCellEmpty: {
    flex: 1,
    aspectRatio: 1,
  },
  bedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  bedNumber: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.card,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
