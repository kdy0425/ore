import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/constants/theme';

interface ChoiceChipsProps<T extends string> {
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function ChoiceChips<T extends string>({ value, options, onChange }: ChoiceChipsProps<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.chip, selected && styles.selected]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8 },
  selected: { backgroundColor: colors.ink, borderColor: colors.ink },
  label: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  selectedLabel: { color: colors.white },
});
