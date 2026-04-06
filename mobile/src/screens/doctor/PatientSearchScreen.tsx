import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme';
import { Header, Input, PatientCard, EmptyState } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PatientResult {
  id: string;
  patientId: string;
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
}

const DEBOUNCE_MS = 300;

export default function PatientSearchScreen() {
  const navigation = useNavigation<any>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await api.get('/patients', { params: { q: q.trim(), limit: 20 } });
      const list = Array.isArray(data) ? data : data.data ?? data.patients ?? [];
      setResults(list);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Search failed' });
    } finally {
      setLoading(false);
    }
  }, []);

  const onChangeText = (text: string) => {
    setQuery(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(text), DEBOUNCE_MS);
  };

  const renderItem = ({ item }: { item: PatientResult }) => (
    <PatientCard
      name={item.name}
      patientId={item.patientId}
      age={item.age}
      gender={item.gender}
      phone={item.phone}
      onPress={() => navigation.navigate('PatientSummary', { patientId: item.id })}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header title="Patients" />
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="Search by name, ID, or phone..."
              value={query}
              onChangeText={onChangeText}
              leftIcon={<Ionicons name="search" size={18} color={colors.textTertiary} />}
              autoCapitalize="none"
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity
            style={styles.scanBtn}
            accessibilityLabel="Scan patient barcode"
            onPress={() => {
              navigation.navigate('Scanner', {
                onScan: (data: string) => {
                  setQuery(data);
                  search(data);
                },
              });
            }}
          >
            <Ionicons name="scan" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={results.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            searched ? (
              <EmptyState icon="search-outline" title="No patients found" subtitle="Try a different search term" />
            ) : (
              <EmptyState icon="people-outline" title="Search patients" subtitle="Enter at least 2 characters to search" />
            )
          }
          keyboardShouldPersistTaps="handled"
        />
      )}
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
});
