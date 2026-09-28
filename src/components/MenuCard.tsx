import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadow, spacing } from '@/constants/theme';

interface MenuCardProps {
  title: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accent?: string;
}

export function MenuCard({ title, description, icon, onPress, accent = colors.brand }: MenuCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}14` }]}>
        <Ionicons name={icon} size={26} color={accent} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.inkMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 108,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadow,
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 5 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  description: { color: colors.inkMuted, fontSize: 14, lineHeight: 20 },
});
