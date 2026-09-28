import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { AppButton } from '@/components/AppButton';
import { ChoiceChips } from '@/components/ChoiceChips';
import { FormField } from '@/components/FormField';
import { Screen } from '@/components/Screen';
import { StateView } from '@/components/StateView';
import { colors, radii, spacing } from '@/constants/theme';
import { canManageNotices, isSuperAdmin } from '@/lib/permissions';
import { toUserMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { loadBranches } from '@/services/admin';
import { loadNotice, removeNoticeImages, uploadNoticeImages } from '@/services/notices';
import type { Branch } from '@/types/auth';
import type { Enums } from '@/types/database';

export default function NoticeFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { profile } = useAuth();
  const [scope, setScope] = useState<Enums<'notice_scope'>>(isSuperAdmin(profile) ? 'global' : 'branch');
  const [branchId, setBranchId] = useState<string | null>(profile?.branch_id ?? null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [assets, setAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [existingPaths, setExistingPaths] = useState<string[]>([]);
  const [originalPaths, setOriginalPaths] = useState<string[]>([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageCount = existingPaths.length + assets.length;

  useEffect(() => {
    void loadBranches().then(setBranches).catch(() => setError('지점 목록을 불러오지 못했습니다.'));
    if (!id) return;
    void loadNotice(id).then((notice) => {
      setScope(notice.scope);
      setBranchId(notice.branch_id);
      setTitle(notice.title);
      setBody(notice.body);
      const paths = notice.notice_images.sort((a, b) => a.sort_order - b.sort_order).map((image) => image.storage_path);
      setExistingPaths(paths);
      setOriginalPaths(paths);
    }).catch(() => setError('공지 정보를 불러오지 못했습니다.')).finally(() => setLoading(false));
  }, [id]);

  const scopeOptions = useMemo(() => isSuperAdmin(profile)
    ? [{ value: 'global' as const, label: '전체공지' }, { value: 'branch' as const, label: '지점공지' }]
    : [{ value: 'branch' as const, label: '지점공지' }], [profile]);

  if (!canManageNotices(profile)) return <StateView title="접근 권한이 없습니다." />;
  if (loading) return <StateView loading title="공지 정보를 불러오는 중입니다" />;

  const pickImages = async () => {
    const remaining = 5 - imageCount;
    if (remaining <= 0) return Alert.alert('이미지는 최대 5개까지 첨부할 수 있습니다.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.85,
    });
    if (!result.canceled) setAssets((current) => [...current, ...result.assets].slice(0, 5 - existingPaths.length));
  };

  const submit = async () => {
    const effectiveBranchId = scope === 'global' ? null : branchId;
    if (!title.trim() || !body.trim() || (scope === 'branch' && !effectiveBranchId)) {
      setError('제목, 본문, 공지 범위를 모두 입력해주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    let uploaded: string[] = [];
    try {
      uploaded = await uploadNoticeImages(assets, scope, effectiveBranchId);
      const paths = [...existingPaths, ...uploaded];
      const args = {
        notice_title: title.trim(),
        notice_body: body.trim(),
        image_paths: paths,
      };
      if (id) {
        const { error: updateError } = await supabase.rpc('update_notice', { target_notice_id: id, ...args });
        if (updateError) throw updateError;
        const removed = originalPaths.filter((path) => !existingPaths.includes(path));
        await removeNoticeImages(removed);
      } else {
        const { error: createError } = await supabase.rpc('create_notice', {
          notice_scope: scope,
          notice_branch_id: effectiveBranchId!,
          ...args,
        });
        if (createError) throw createError;
      }
      router.replace('/admin/notices');
    } catch (submitError) {
      if (uploaded.length) await removeNoticeImages(uploaded).catch(() => undefined);
      setError(toUserMessage(submitError, '공지를 저장하지 못했습니다.'));
    } finally { setBusy(false); }
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      {!id ? (
        <>
          <Text style={styles.label}>공지 범위</Text>
          <ChoiceChips value={scope} options={scopeOptions} onChange={(value) => { setScope(value); if (value === 'global') setBranchId(null); else setBranchId(profile?.branch_id ?? branches[0]?.id ?? null); }} />
          {scope === 'branch' && isSuperAdmin(profile) ? (
            <><Text style={styles.label}>공지 지점</Text><ChoiceChips value={branchId} options={branches.map((branch) => ({ value: branch.id, label: branch.name }))} onChange={setBranchId} /></>
          ) : null}
        </>
      ) : null}
      <FormField label="제목" value={title} onChangeText={setTitle} maxLength={120} placeholder="공지 제목" />
      <FormField label="본문" value={body} onChangeText={setBody} maxLength={10000} multiline placeholder="공지 내용을 입력해주세요." />
      <View style={styles.imageHeader}><Text style={styles.label}>이미지 ({imageCount}/5)</Text><AppButton label="이미지 선택" variant="secondary" icon="image-outline" onPress={() => void pickImages()} disabled={imageCount >= 5} /></View>
      <View style={styles.imageGrid}>
        {existingPaths.map((path) => (
          <Pressable key={path} onPress={() => setExistingPaths((current) => current.filter((item) => item !== path))} style={styles.existingImage}>
            <Text style={styles.existingText}>저장된 이미지</Text><Text style={styles.removeText}>눌러서 제외</Text>
          </Pressable>
        ))}
        {assets.map((asset, index) => (
          <Pressable key={`${asset.uri}-${index}`} onPress={() => setAssets((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
            <Image source={{ uri: asset.uri }} style={styles.preview} />
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton label={id ? '공지 수정' : '공지 등록'} onPress={() => void submit()} loading={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  label: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  imageHeader: { gap: spacing.sm },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preview: { width: 96, height: 96, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  existingImage: { width: 96, height: 96, borderRadius: radii.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', padding: spacing.xs },
  existingText: { color: colors.ink, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  removeText: { color: colors.danger, fontSize: 10, marginTop: 4 },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center' },
});
