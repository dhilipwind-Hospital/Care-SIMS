import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { typography, fontSize, fontWeight } from '../../theme/typography';
import { borderRadius } from '../../theme';
import { Button, Input } from '../../components';
import api from '../../lib/api';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ChangePasswordScreen({ navigation }: { navigation?: any }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Validation
  const errors: Record<string, string> = {};
  if (currentPassword.length > 0 && currentPassword.length < 1) {
    errors.current = 'Current password is required';
  }
  if (newPassword.length > 0 && newPassword.length < 8) {
    errors.new = 'Must be at least 8 characters';
  }
  if (confirmPassword.length > 0 && confirmPassword !== newPassword) {
    errors.confirm = 'Passwords do not match';
  }

  const isValid =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    confirmPassword === newPassword;

  const handleSubmit = async () => {
    if (!currentPassword) {
      Alert.alert('Validation', 'Please enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Validation', 'New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation', 'New passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await api.put('/auth/me/password', {
        currentPassword,
        newPassword,
      });
      Alert.alert('Success', 'Password changed successfully', [
        {
          text: 'OK',
          onPress: () => {
            if (navigation?.goBack) {
              navigation.goBack();
            }
          },
        },
      ]);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to change password';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.primary} />
        </View>

        <Text style={styles.heading}>Change Password</Text>
        <Text style={styles.subtitle}>
          Enter your current password and choose a new one. Minimum 8 characters.
        </Text>

        <Input
          label="Current Password"
          placeholder="Enter current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry={!showCurrent}
          error={errors.current}
          leftIcon={<Ionicons name="key-outline" size={18} color={colors.textTertiary} />}
        />

        <Input
          label="New Password"
          placeholder="Enter new password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showNew}
          error={errors.new}
          leftIcon={<Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />}
        />

        <Input
          label="Confirm New Password"
          placeholder="Re-enter new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirm}
          error={errors.confirm}
          leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color={colors.textTertiary} />}
        />

        {/* Password strength hint */}
        {newPassword.length > 0 && (
          <View style={styles.strengthRow}>
            <View
              style={[
                styles.strengthBar,
                {
                  backgroundColor:
                    newPassword.length < 8
                      ? colors.danger
                      : newPassword.length < 12
                        ? colors.warning
                        : colors.success,
                  width: `${Math.min(100, (newPassword.length / 16) * 100)}%`,
                },
              ]}
            />
          </View>
        )}

        <Button
          title="Change Password"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!isValid}
          style={{ marginTop: 16 }}
        />
      </ScrollView>
      </KeyboardAvoidingView>
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
  scroll: {
    padding: 24,
    paddingTop: 32,
  },
  iconWrap: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heading: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 28,
  },
  strengthRow: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    marginTop: -6,
    marginBottom: 8,
    overflow: 'hidden',
  },
  strengthBar: {
    height: 4,
    borderRadius: 2,
  },
});
