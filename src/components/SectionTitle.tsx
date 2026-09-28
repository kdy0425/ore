import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';

export function SectionTitle({ title, caption }: { title: string; caption?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  title: { color: colors.ink, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  caption: { color: colors.inkMuted, fontSize: 14, lineHeight: 21 },
});
