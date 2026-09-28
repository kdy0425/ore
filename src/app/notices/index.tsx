import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { StateView } from '@/components/StateView';
import { colors, radii, spacing } from '@/constants/theme';
import { loadNotices, type NoticeWithRelations } from '@/services/notices';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export default function NoticesScreen() {
  const [notices, setNotices] = useState<NoticeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setNotices(await loadNotices());
      setError(null);
    } catch {
      setError('공지사항을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  if (loading) return <StateView loading title="공지사항을 불러오는 중입니다" />;
  if (error) return <StateView title={error} description="잠시 후 다시 시도해주세요." />;

  return (
    <Screen contentContainerStyle={styles.content}>
      {notices.length === 0 ? (
        <StateView title="등록된 공지사항이 없습니다." />
      ) : notices.map((notice) => {
        const unread = notice.notice_reads.length === 0;
        return (
          <Pressable
            key={notice.id}
            onPress={() => router.push({ pathname: '/notices/[id]', params: { id: notice.id } })}
            style={({ pressed }) => [styles.card, unread && styles.unreadCard, pressed && styles.pressed]}
          >
            <View style={styles.topRow}>
              <Text style={[styles.scope, notice.scope === 'global' ? styles.global : styles.branch]}>
                {notice.scope === 'global' ? '전체' : notice.branch?.name ?? '지점'}
              </Text>
              {unread ? <View style={styles.unreadDot} /> : <Text style={styles.read}>읽음</Text>}
            </View>
            <Text style={styles.title} numberOfLines={2}>{notice.title}</Text>
            <Text style={styles.body} numberOfLines={2}>{notice.body}</Text>
            <View style={styles.meta}>
              <Text style={styles.date}>{formatDate(notice.created_at)}</Text>
              {notice.notice_images.length ? <Ionicons name="image-outline" size={16} color={colors.inkMuted} /> : null}
            </View>
          </Pressable>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, gap: spacing.xs },
  unreadCard: { borderColor: '#E7AAA6', backgroundColor: '#FFFAF9' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scope: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 5, overflow: 'hidden', fontSize: 11, fontWeight: '900' },
  global: { color: colors.brand, backgroundColor: colors.brandSoft },
  branch: { color: '#2D5B9B', backgroundColor: '#E8F0FB' },
  unreadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.brand },
  read: { color: colors.inkMuted, fontSize: 11 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900', lineHeight: 23 },
  body: { color: colors.inkMuted, fontSize: 13, lineHeight: 19 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  date: { color: colors.inkMuted, fontSize: 11 },
  pressed: { opacity: 0.72 },
});
