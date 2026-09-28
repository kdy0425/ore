import type { ComponentProps } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';

interface FormFieldProps extends ComponentProps<typeof TextInput> {
  label: string;
  error?: string;
}

export function FormField({ label, error, style, ...props }: FormFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.inkMuted}
        style={[styles.input, props.multiline ? styles.multiline : null, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.ink,
    fontSize: 15,
  },
  multiline: { minHeight: 140, paddingTop: spacing.md, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12 },
});
