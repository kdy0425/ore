import { StyleSheet, View } from 'react-native';
import { colors, radii } from '@/constants/theme';

export function ProgressBar({ value }: { value: number }) {
  const width = `${Math.max(0, Math.min(1, value)) * 100}%` as const;
  return (
    <View style={styles.track} accessibilityRole="progressbar">
      <View style={[styles.fill, { width }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.brand },
});
