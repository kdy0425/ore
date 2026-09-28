import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/constants/theme';

export function StatCard({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <View style={[styles.card, accent && styles.accentCard]}>
      <Text style={[styles.value, accent && styles.accentValue]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 140,
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  accentCard: { backgroundColor: colors.brandSoft, borderColor: '#F4C9C5' },
  value: { color: colors.ink, fontSize: 27, fontWeight: '900' },
  accentValue: { color: colors.brandDark },
  label: { color: colors.inkMuted, fontSize: 13, fontWeight: '700' },
});
