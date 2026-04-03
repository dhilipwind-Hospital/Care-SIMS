import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, shadow } from '../theme';

interface PatientCardProps {
  name: string;
  patientId: string;
  age?: number;
  gender?: string;
  phone?: string;
  onPress?: () => void;
  rightContent?: React.ReactNode;
}

export function PatientCard({
  name,
  patientId,
  age,
  gender,
  phone,
  onPress,
  rightContent,
}: PatientCardProps) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.card, shadow.sm]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Ionicons
          name={gender?.toLowerCase() === 'female' ? 'woman' : 'man'}
          size={24}
          color={colors.primary}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.details}>
          {patientId}
          {age ? ` | ${age} yrs` : ''}
          {gender ? ` | ${gender}` : ''}
        </Text>
        {phone && (
          <Text style={styles.phone}>
            <Ionicons name="call-outline" size={11} color={colors.textTertiary} />{' '}
            {phone}
          </Text>
        )}
      </View>
      {rightContent && <View style={styles.right}>{rightContent}</View>}
      {onPress && !rightContent && (
        <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  details: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  phone: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  right: {
    marginLeft: 8,
  },
});
