import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { StateView } from '@/components/StateView';
import { colors, radii, spacing } from '@/constants/theme';
import {
  createNoticeImageUrls,
  loadNotice,
  markNoticeRead,
  type NoticeWithRelations,
} from '@/services/notices';

export default function NoticeDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const [notice, setNotice] = useState<NoticeWithRelations | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await loadNotice(id);
        const imageUrls = await createNoticeImageUrls(data.notice_images.map((image) => image.storage_path));
        await markNoticeRead(id);
        if (active) {
          setNotice(data);
          setUrls(imageUrls);
        }
      } catch {
        if (active) setError('공지사항을 불러오지 못했습니다.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  if (loading) return <StateView loading title="공지사항을 불러오는 중입니다" />;
  if (error || !notice) return <StateView title={error ?? '공지사항을 찾을 수 없습니다.'} />;

  return (
    <Screen contentContainerStyle={styles.content}>
      <Text style={[styles.scope, notice.scope === 'global' ? styles.global : styles.branch]}>
        {notice.scope === 'global' ? '전체공지' : notice.branch?.name ?? '지점공지'}
      </Text>
      <Text style={styles.title}>{notice.title}</Text>
      <Text style={styles.date}>{new Intl.DateTimeFormat('ko-KR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(notice.created_at))}</Text>
      <View style={styles.divider} />
      <Text style={styles.body}>{notice.body}</Text>
      <View style={styles.images}>
        {notice.notice_images.map((image) => urls[image.storage_path] ? (
          <Image key={image.id} source={{ uri: urls[image.storage_path] }} style={styles.image} resizeMode="cover" />
        ) : null)}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  scope: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: 11, paddingVertical: 6, overflow: 'hidden', fontSize: 12, fontWeight: '900' },
  global: { color: colors.brand, backgroundColor: colors.brandSoft },
  branch: { color: '#2D5B9B', backgroundColor: '#E8F0FB' },
  title: { color: colors.ink, fontSize: 26, fontWeight: '900', lineHeight: 34 },
  date: { color: colors.inkMuted, fontSize: 12 },
  divider: { height: 1, backgroundColor: colors.border },
  body: { color: colors.ink, fontSize: 16, lineHeight: 27 },
  images: { gap: spacing.md },
  image: { width: '100%', aspectRatio: 1.5, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
});
