import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '@/constants/theme';

type OptionState = 'default' | 'selected' | 'correct' | 'wrong';

interface OptionCardProps {
  index: number;
  label: string;
  state?: OptionState;
  disabled?: boolean;
  onPress: () => void;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function OptionCard({ index, label, state = 'default', disabled = false, onPress }: OptionCardProps) {
  const icon = state === 'correct' ? 'checkmark-circle' : state === 'wrong' ? 'close-circle' : null;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.option,
        styles[state],
        disabled && state === 'default' && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={[styles.index, state !== 'default' && styles.indexActive]}>
        <Text style={[styles.indexText, state !== 'default' && styles.indexTextActive]}>{LETTERS[index] ?? index + 1}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
      {icon ? (
        <Ionicons name={icon} size={23} color={state === 'correct' ? colors.success : colors.danger} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
  },
  default: {},
  selected: { borderColor: colors.ink, backgroundColor: colors.surfaceMuted },
  correct: { borderColor: colors.success, backgroundColor: colors.successSoft },
  wrong: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  disabled: { opacity: 0.58 },
  pressed: { opacity: 0.76 },
  index: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexActive: { backgroundColor: colors.ink },
  indexText: { fontSize: 13, fontWeight: '900', color: colors.inkMuted },
  indexTextActive: { color: colors.white },
  label: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '700', lineHeight: 23 },
});
