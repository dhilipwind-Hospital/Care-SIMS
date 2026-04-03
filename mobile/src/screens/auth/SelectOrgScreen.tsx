import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { DoctorAffiliation } from '../../types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type AuthStackParamList = {
  Login: undefined;
  SelectOrg: undefined;
  ForgotPassword: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, 'SelectOrg'>;

export default function SelectOrgScreen({ navigation }: Props) {
  const { affiliations, selectOrg } = useAuth();
  const insets = useSafeAreaInsets();

  async function handleSelect(tenantId: string) {
    try {
      await selectOrg(tenantId);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || 'Failed to select organization. Please try again.';
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: message,
      });
    }
  }

  function renderItem({ item }: { item: DoctorAffiliation }) {
    return (
      <TouchableOpacity
        style={styles.orgCard}
        onPress={() => handleSelect(item.tenantId)}
        activeOpacity={0.7}
      >
        <View style={styles.orgIcon}>
          <Ionicons name="business-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.orgInfo}>
          <Text style={styles.orgName}>{item.tenantName}</Text>
          <Text style={styles.orgDetails}>
            {item.role}
            {item.departmentName ? ` \u2022 ${item.departmentName}` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Select Organization</Text>
        <View style={styles.backPlaceholder} />
      </View>

      <Text style={styles.subtitle}>
        You are affiliated with multiple organizations. Please select one to continue.
      </Text>

      <FlatList
        data={affiliations ?? []}
        keyExtractor={(item) => item.tenantId}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No organizations found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 36,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 20,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  orgCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  orgIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  orgDetails: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: 12,
  },
});
