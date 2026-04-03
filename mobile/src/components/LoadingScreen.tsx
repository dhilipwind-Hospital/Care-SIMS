import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Ionicons name="heart" size={48} color={colors.primary} />
        <View style={styles.crossOverlay}>
          <Ionicons name="add" size={24} color={colors.white} />
        </View>
      </View>
      <Text style={styles.brand}>Ayphen HMS</Text>
      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={styles.spinner}
      />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  crossOverlay: {
    position: 'absolute',
    top: 18,
    left: 28,
    backgroundColor: colors.primary,
    borderRadius: 4,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    ...typography.h3,
    color: colors.primary,
    marginBottom: 32,
  },
  spinner: {
    marginBottom: 16,
  },
  message: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
