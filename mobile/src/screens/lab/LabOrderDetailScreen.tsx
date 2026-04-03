import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import { typography, fontWeight } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme';
import { Header, StatusBadge, getStatusVariant, EmptyState, Button } from '../../components';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TestItem {
  id: string;
  testName?: string;
  name?: string;
  testCode?: string;
  code?: string;
  category?: string;
  status: string;
}

interface LabOrderDetail {
  id: string;
  orderNumber?: string;
  status: string;
  patient?: {
    id: string;
    name: string;
    age?: number;
    gender?: string;
    phone?: string;
    mrn?: string;
  };
  patientName?: string;
  doctor?: { name: string };
  doctorName?: string;
  tests?: TestItem[];
  testItems?: TestItem[];
  createdAt?: string;
  notes?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LabOrderDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<LabOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrder = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get(`/lab/orders/${orderId}`);
      setOrder(data.data ?? data);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load order details' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrder(true);
  }, [fetchOrder]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
        <View style={styles.center}>
        <EmptyState icon="alert-circle-outline" title="Order not found" subtitle="This lab order could not be loaded" />
      </View>
      </SafeAreaView>
    );
  }

  const tests = order.tests ?? order.testItems ?? [];
  const patientName = order.patient?.name ?? order.patientName ?? 'Unknown';
  const canEnterResults = ['SAMPLE_COLLECTED', 'IN_PROGRESS'].includes(order.status);

  const renderTestItem = ({ item }: { item: TestItem }) => (
    <View style={styles.testCard}>
      <View style={styles.testInfo}>
        <Text style={styles.testName}>{item.testName ?? item.name ?? '--'}</Text>
        {(item.testCode ?? item.code) && (
          <Text style={styles.testCode}>{item.testCode ?? item.code}</Text>
        )}
        {item.category && (
          <Text style={styles.testCategory}>{item.category}</Text>
        )}
      </View>
      <StatusBadge label={item.status.replace(/_/g, ' ')} variant={getStatusVariant(item.status)} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <View style={styles.container}>
      <Header
        title={order.orderNumber ?? `Order #${orderId.slice(0, 6)}`}
        subtitle={order.status.replace(/_/g, ' ')}
        onBack={() => navigation.goBack()}
      />

      <FlatList
        data={tests}
        keyExtractor={(item) => item.id}
        renderItem={renderTestItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={tests.length === 0 ? styles.emptyContainer : styles.listContent}
        ListHeaderComponent={
          <View style={styles.patientHeader}>
            <View style={styles.patientIconWrap}>
              <Ionicons name="person-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patientName}</Text>
              <Text style={styles.patientMeta}>
                {order.patient?.age ? `${order.patient.age} yrs` : ''}
                {order.patient?.gender ? ` | ${order.patient.gender}` : ''}
                {order.patient?.mrn ? ` | MRN: ${order.patient.mrn}` : ''}
              </Text>
              {(order.doctor?.name ?? order.doctorName) && (
                <Text style={styles.patientMeta}>
                  Dr. {order.doctor?.name ?? order.doctorName}
                </Text>
              )}
            </View>
            <StatusBadge label={order.status.replace(/_/g, ' ')} variant={getStatusVariant(order.status)} />
          </View>
        }
        ListEmptyComponent={<EmptyState icon="flask-outline" title="No test items" subtitle="This order has no test items" />}
        ListFooterComponent={
          canEnterResults ? (
            <Button
              title="Enter Results"
              variant="primary"
              onPress={() => navigation.navigate('LabResultEntry', { orderId: order.id })}
              style={styles.enterResultsBtn}
            />
          ) : null
        }
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
  listContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.base,
    ...shadow.sm,
  },
  patientIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  patientMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  testCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  testInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  testName: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  testCode: {
    ...typography.caption,
    color: colors.primary,
    marginTop: 2,
  },
  testCategory: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  enterResultsBtn: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
