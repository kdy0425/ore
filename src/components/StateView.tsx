import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';

interface StateViewProps {
  title: string;
  description?: string;
  loading?: boolean;
}

export function StateView({ title, description, loading = false }: StateViewProps) {
  return (
    <View style={styles.wrap}>
      {loading ? <ActivityIndicator color={colors.brand} size="large" /> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  title: { color: colors.ink, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  description: { color: colors.inkMuted, fontSize: 14, textAlign: 'center', lineHeight: 21 },
});
