import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightContent?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  borderBottom?: boolean;
}

export function ListItem({
  title,
  subtitle,
  leftIcon,
  rightContent,
  onPress,
  showChevron = true,
  borderBottom = true,
}: ListItemProps) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.container, borderBottom && styles.borderBottom]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightContent && <View style={styles.rightContent}>{rightContent}</View>}
      {onPress && showChevron && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={colors.textTertiary}
          style={styles.chevron}
        />
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  leftIcon: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.body,
    color: colors.text,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rightContent: {
    marginLeft: 8,
  },
  chevron: {
    marginLeft: 4,
  },
});
