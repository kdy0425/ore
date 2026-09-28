import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_LINKS } from '@/constants/appLinks';
import { colors, spacing } from '@/constants/theme';

interface PolicyLinksProps {
  showHeading?: boolean;
}

const links = [
  { label: '개인정보처리방침', url: APP_LINKS.privacy },
  { label: '고객지원', url: APP_LINKS.support },
  { label: '계정 삭제 안내', url: APP_LINKS.accountDeletion },
];

const openLink = (url: string) => {
  void Linking.openURL(url).catch(() => {
    Alert.alert('페이지를 열 수 없습니다', '인터넷 연결을 확인한 뒤 다시 시도해주세요.');
  });
};

export function PolicyLinks({ showHeading = false }: PolicyLinksProps) {
  return (
    <View style={styles.container}>
      {showHeading ? <Text style={styles.heading}>도움말 및 정책</Text> : null}
      <View style={styles.links}>
        {links.map((link) => (
          <Pressable
            key={link.url}
            accessibilityRole="link"
            accessibilityLabel={`${link.label} 웹페이지 열기`}
            hitSlop={8}
            onPress={() => openLink(link.url)}
            style={({ pressed }) => [styles.linkButton, pressed ? styles.pressed : null]}
          >
            <Text style={styles.linkText}>{link.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, alignItems: 'center' },
  heading: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  linkButton: { paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
  linkText: { color: colors.ink, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' },
  pressed: { opacity: 0.55 },
});
