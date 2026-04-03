import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import api from '../../lib/api';
import { colors } from '../../theme/colors';
import { typography, fontSize, fontWeight } from '../../theme/typography';
import { spacing, borderRadius, shadow } from '../../theme';
import { Header, Button } from '../../components';
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
}

interface ResultEntry {
  testItemId: string;
  resultValue: string;
  unit: string;
  referenceRange: string;
  flag: string;
  remarks: string;
}

const FLAG_OPTIONS = ['Normal', 'High', 'Low', 'Critical High', 'Critical Low'] as const;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LabResultEntryScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { orderId } = route.params;

  const [testItems, setTestItems] = useState<TestItem[]>([]);
  const [results, setResults] = useState<Record<string, ResultEntry>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get(`/lab/orders/${orderId}`);
      const order = data.data ?? data;
      const tests: TestItem[] = order.tests ?? order.testItems ?? [];
      setTestItems(tests);

      // Initialize result entries
      const initial: Record<string, ResultEntry> = {};
      tests.forEach((t) => {
        initial[t.id] = {
          testItemId: t.id,
          resultValue: '',
          unit: '',
          referenceRange: '',
          flag: 'Normal',
          remarks: '',
        };
      });
      setResults(initial);
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to load order' });
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const updateResult = (testItemId: string, field: keyof ResultEntry, value: string) => {
    setResults((prev) => ({
      ...prev,
      [testItemId]: { ...prev[testItemId], [field]: value },
    }));
  };

  const handleSubmit = async () => {
    // Validate: at least one result value
    const entries = Object.values(results);
    const hasAny = entries.some((e) => e.resultValue.trim().length > 0);
    if (!hasAny) {
      Alert.alert('Validation', 'Please enter at least one result value.');
      return;
    }

    setSubmitting(true);
    try {
      // Submit results
      await api.post(`/lab/orders/${orderId}/results`, {
        results: entries.filter((e) => e.resultValue.trim().length > 0),
      });

      // Auto-update status to RESULTED
      await api.patch(`/lab/orders/${orderId}/status`, { status: 'RESULTED' });

      Toast.show({ type: 'success', text1: 'Results submitted successfully' });
      navigation.goBack();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: err?.response?.data?.message ?? 'Failed to submit results' });
    } finally {
      setSubmitting(false);
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
      <Header
        title="Enter Results"
        subtitle={`Order ${orderId.slice(0, 8)}`}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {testItems.map((test) => {
          const entry = results[test.id];
          if (!entry) return null;

          return (
              <View key={test.id} style={styles.testSection}>
              <View style={styles.testHeader}>
                <Ionicons name="flask" size={16} color={colors.primary} />
                <Text style={styles.testName}>{test.testName ?? test.name ?? '--'}</Text>
                {(test.testCode ?? test.code) && (
                  <Text style={styles.testCode}>({test.testCode ?? test.code})</Text>
                )}
              </View>

              <View style={styles.fieldRow}>
                <View style={styles.fieldFlex2}>
                  <Text style={styles.fieldLabel}>Result Value</Text>
                  <TextInput
                    style={styles.inputLarge}
                    value={entry.resultValue}
                    onChangeText={(v) => updateResult(test.id, 'resultValue', v)}
                    placeholder="Enter value"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.fieldFlex1}>
                  <Text style={styles.fieldLabel}>Unit</Text>
                  <TextInput
                    style={styles.input}
                    value={entry.unit}
                    onChangeText={(v) => updateResult(test.id, 'unit', v)}
                    placeholder="e.g. mg/dL"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Reference Range</Text>
              <TextInput
                style={styles.input}
                value={entry.referenceRange}
                onChangeText={(v) => updateResult(test.id, 'referenceRange', v)}
                placeholder="e.g. 70-100"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.fieldLabel}>Flag</Text>
              <View style={styles.flagRow}>
                {FLAG_OPTIONS.map((flag) => {
                  const isActive = entry.flag === flag;
                  const flagColor = flag.includes('Critical')
                    ? colors.danger
                    : flag === 'High'
                    ? colors.warning
                    : flag === 'Low'
                    ? colors.info
                    : colors.success;

                  return (
                      <TouchableOpacity
                      key={flag}
                      style={[
                        styles.flagChip,
                        isActive && { backgroundColor: flagColor, borderColor: flagColor },
                      ]}
                      onPress={() => updateResult(test.id, 'flag', flag)}
                    >
                      <Text
                        style={[
                          styles.flagChipText,
                          isActive && { color: colors.white },
                        ]}
                      >
                        {flag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Remarks</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={entry.remarks}
                onChangeText={(v) => updateResult(test.id, 'remarks', v)}
                placeholder="Optional remarks"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
              />
            </View>
          );
        })}

        <Button
          title="Submit Results"
          variant="primary"
          loading={submitting}
          onPress={handleSubmit}
          style={styles.submitBtn}
        />
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  testSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.base,
    marginBottom: spacing.base,
    ...shadow.sm,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  testName: {
    ...typography.body,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  testCode: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  fieldFlex2: {
    flex: 2,
  },
  fieldFlex1: {
    flex: 1,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: fontSize.base,
    color: colors.text,
  },
  inputLarge: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  flagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  flagChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  flagChipText: {
    ...typography.caption,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
});
