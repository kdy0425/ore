import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/constants/theme';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
  loading?: boolean;
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
}: AppButtonProps) {
  const blocked = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        blocked && styles.disabled,
        pressed && !blocked && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? colors.white : colors.ink} />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={20}
              color={variant === 'primary' || variant === 'danger' ? colors.white : colors.ink}
            />
          ) : null}
          <Text style={[styles.label, variant === 'primary' || variant === 'danger' ? styles.lightLabel : null]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    borderWidth: 1,
  },
  primary: { backgroundColor: colors.brand, borderColor: colors.brand },
  secondary: { backgroundColor: colors.surface, borderColor: colors.border },
  danger: { backgroundColor: colors.danger, borderColor: colors.danger },
  ghost: { backgroundColor: 'transparent', borderColor: 'transparent' },
  label: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  lightLabel: { color: colors.white },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
