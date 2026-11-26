import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Colors } from '@/src/theme/colors';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'brand' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: ViewStyle;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}: AppButtonProps) {
  const isPrimary = variant === 'primary';
  const isBrand = variant === 'brand';
  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  const backgroundColor = disabled
    ? '#E2E8F0'
    : isPrimary
    ? Colors.ui.buttonPrimary
    : isBrand
    ? Colors.ui.buttonSuccess
    : isDanger
    ? Colors.ui.buttonDanger
    : isSecondary
    ? Colors.ui.buttonSecondary
    : 'transparent';

  const textColor = disabled
    ? '#94A3B8'
    : isPrimary || isBrand
    ? '#FFFFFF'
    : isDanger
    ? Colors.ui.buttonDangerText
    : isOutline
    ? Colors.brand.navy
    : Colors.ui.buttonSecondaryText;

  const borderColor = isOutline ? Colors.border.default : 'transparent';

  return (
    <TouchableOpacity
      style={[
        styles.base,
        isSmall && styles.sm,
        isLarge && styles.lg,
        { backgroundColor, borderColor, borderWidth: isOutline ? 1 : 0 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon ? <Text style={[styles.icon, { color: textColor }]}>{icon}</Text> : null}
          <Text style={[styles.text, isSmall && styles.smText, { color: textColor }]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    minWidth: 44,
  },
  sm: {
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  lg: {
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 20,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  smText: {
    fontSize: 12,
    fontWeight: '700',
  },
  icon: {
    fontSize: 15,
    marginRight: 8,
  },
});
