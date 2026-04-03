import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const variantBg: Record<ButtonVariant, string> = {
  primary: colors.primary,
  secondary: colors.primaryLight,
  outline: 'transparent',
  danger: colors.danger,
  ghost: 'transparent',
};

const variantFg: Record<ButtonVariant, string> = {
  primary: colors.white,
  secondary: colors.white,
  outline: colors.primary,
  danger: colors.white,
  ghost: colors.primary,
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
  size = 'md',
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const bg = variantBg[variant];
  const fg = variantFg[variant];
  const borderColor = variant === 'outline' ? colors.primary : 'transparent';
  const paddingVertical = size === 'sm' ? 8 : size === 'lg' ? 16 : 12;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[
        styles.base,
        { backgroundColor: isDisabled ? colors.disabled : bg, borderColor, paddingVertical },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[typography.button, { color: fg, marginLeft: icon ? 6 : 0 }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 20,
  },
});
