import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppButton } from '@/components/AppButton';
import { Screen } from '@/components/Screen';
import { StateView } from '@/components/StateView';
import { colors, radii, spacing } from '@/constants/theme';
import { canManageNotices, isSuperAdmin } from '@/lib/permissions';
import { toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { loadNotices, removeNoticeImages, type NoticeWithRelations } from '@/services/notices';

export default function AdminNoticesScreen() {
  const { profile } = useAuth();
  const [notices, setNotices] = useState<NoticeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setNotices(await loadNotices()); setError(null); }
    catch { setError('공지사항을 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  if (!canManageNotices(profile)) return <StateView title="접근 권한이 없습니다." />;
  if (loading) return <StateView loading title="공지사항을 불러오는 중입니다" />;
  if (error) return <StateView title={error} />;

  const editable = (notice: NoticeWithRelations) => isSuperAdmin(profile)
    || (notice.scope === 'branch' && notice.branch_id === profile?.branch_id);

  const remove = (notice: NoticeWithRelations) => {
    Alert.alert('공지 삭제', '공지와 읽음 기록을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        try {
          const { data, error: deleteError } = await supabase.rpc('delete_notice', { target_notice_id: notice.id });
          if (deleteError) throw deleteError;
          await removeNoticeImages(data ?? []);
          await refresh();
        } catch (deleteError) { Alert.alert('삭제 실패', toUserMessage(deleteError)); }
      } },
    ]);
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <AppButton label="새 공지 작성" icon="add" onPress={() => router.push('/admin/notice-form')} />
      {notices.length === 0 ? <StateView title="등록된 공지사항이 없습니다." /> : notices.map((notice) => (
        <View key={notice.id} style={styles.card}>
          <Pressable style={styles.flex} onPress={() => router.push({ pathname: '/notices/[id]', params: { id: notice.id } })}>
            <Text style={styles.scope}>{notice.scope === 'global' ? '전체공지' : notice.branch?.name}</Text>
            <Text style={styles.title}>{notice.title}</Text>
            <Text style={styles.meta}>{new Date(notice.created_at).toLocaleDateString('ko-KR')} · 이미지 {notice.notice_images.length}개</Text>
          </Pressable>
          {editable(notice) ? (
            <View style={styles.actions}>
              <View style={styles.flex}><AppButton label="수정" variant="secondary" onPress={() => router.push({ pathname: '/admin/notice-form', params: { id: notice.id } })} /></View>
              <View style={styles.flex}><AppButton label="삭제" variant="danger" onPress={() => remove(notice)} /></View>
            </View>
          ) : null}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  flex: { flex: 1 },
  scope: { color: colors.brand, fontSize: 11, fontWeight: '900', marginBottom: 4 },
  title: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  meta: { color: colors.inkMuted, fontSize: 11, marginTop: 5 },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
