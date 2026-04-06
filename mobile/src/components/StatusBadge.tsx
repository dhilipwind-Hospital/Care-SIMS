import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { fontSize, fontWeight } from '../theme/typography';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

interface StatusBadgeProps {
  label?: string | null;
  status?: string | null;
  variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: colors.successLight, text: colors.success },
  warning: { bg: colors.warningLight, text: colors.warning },
  danger: { bg: colors.dangerLight, text: colors.danger },
  info: { bg: colors.infoLight, text: colors.info },
  default: { bg: colors.borderLight, text: colors.textSecondary },
};

export function getStatusVariant(status: string): BadgeVariant {
  const s = status?.toUpperCase() ?? '';
  if (['COMPLETED', 'PAID', 'ACTIVE', 'NORMAL', 'DISPENSED'].includes(s)) return 'success';
  if (['WAITING', 'PENDING', 'SCHEDULED', 'PROCESSING'].includes(s)) return 'warning';
  if (['CANCELLED', 'NO_SHOW', 'CRITICAL', 'OVERDUE', 'REJECTED'].includes(s)) return 'danger';
  if (['IN_PROGRESS', 'IN_CONSULT', 'BOOKED', 'CONFIRMED'].includes(s)) return 'info';
  return 'default';
}

export default function StatusBadge({ label, status, variant }: StatusBadgeProps) {
  // Accept either label or status prop
  const text = label || status || 'Unknown';
  const safeText = String(text).replace(/_/g, ' ');
  const finalVariant: BadgeVariant = variant || (status ? getStatusVariant(status) : (label ? getStatusVariant(label) : 'default'));
  const c = variantColors[finalVariant];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.text }]}>{safeText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
  },
});
