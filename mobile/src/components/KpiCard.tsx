import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface KpiCardProps {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
}

export default function KpiCard({ label, value, color = colors.primary, icon }: KpiCardProps) {
  return (
    <View style={[styles.card, { borderTopColor: color }]}>
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 4,
    borderTopWidth: 3,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconWrap: {
    marginBottom: 4,
  },
  value: {
    ...typography.h2,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
});
