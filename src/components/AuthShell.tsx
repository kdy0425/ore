import type { PropsWithChildren } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { PolicyLinks } from '@/components/PolicyLinks';
import { colors, spacing } from '@/constants/theme';

interface AuthShellProps extends PropsWithChildren {
  title: string;
  description: string;
}

export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <Screen contentContainerStyle={styles.content}>
      <Image
        source={require('../../assets/images/oreno-header.png')}
        resizeMode="contain"
        style={styles.logo}
      />
      <View style={styles.heading}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <View style={styles.form}>{children}</View>
      <PolicyLinks />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', gap: spacing.lg, maxWidth: 520 },
  logo: { width: '100%', height: 58 },
  heading: { gap: spacing.xs },
  title: { color: colors.ink, fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  description: { color: colors.inkMuted, fontSize: 14, lineHeight: 21 },
  form: { gap: spacing.md },
});
