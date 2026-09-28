import type { ImagePickerAsset } from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import type { Enums, Tables } from '@/types/database';

export interface NoticeWithRelations extends Tables<'notices'> {
  branch: Pick<Tables<'branches'>, 'id' | 'name'> | null;
  notice_images: Tables<'notice_images'>[];
  notice_reads: Pick<Tables<'notice_reads'>, 'read_at'>[];
}

export async function loadNotices(limit?: number): Promise<NoticeWithRelations[]> {
  let query = supabase
    .from('notices')
    .select(`
      *,
      branch:branches(id, name),
      notice_images(*),
      notice_reads(read_at)
    `)
    .order('created_at', { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data as unknown as NoticeWithRelations[]) ?? [];
}

export async function loadNotice(id: string): Promise<NoticeWithRelations> {
  const { data, error } = await supabase
    .from('notices')
    .select(`
      *,
      branch:branches(id, name),
      notice_images(*),
      notice_reads(read_at)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as NoticeWithRelations;
}

export async function markNoticeRead(id: string): Promise<void> {
  const { error } = await supabase.rpc('mark_notice_read', { target_notice_id: id });
  if (error) throw error;
}

export async function createNoticeImageUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage.from('notice-images').createSignedUrls(paths, 3600);
  if (error) throw error;
  return Object.fromEntries(
    data
      .filter((item): item is typeof item & { path: string; signedUrl: string } => Boolean(item.path && item.signedUrl))
      .map((item) => [item.path, item.signedUrl]),
  );
}

function extensionFor(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

export async function uploadNoticeImages(
  assets: ImagePickerAsset[],
  scope: Enums<'notice_scope'>,
  branchId: string | null,
): Promise<string[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error('로그인이 필요합니다.');
  const prefix = scope === 'global' ? 'global' : branchId;
  if (!prefix) throw new Error('지점이 필요합니다.');

  const uploaded: string[] = [];
  try {
    for (const [index, asset] of assets.entries()) {
      const mimeType = asset.mimeType ?? 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        throw new Error('JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.');
      }
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        throw new Error('이미지는 파일당 5MB 이하여야 합니다.');
      }

      const response = await fetch(asset.uri);
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength > 5 * 1024 * 1024) throw new Error('이미지는 파일당 5MB 이하여야 합니다.');
      const path = `${prefix}/${authData.user.id}/${Date.now()}-${index}-${Math.random().toString(36).slice(2)}.${extensionFor(mimeType)}`;
      const { error } = await supabase.storage.from('notice-images').upload(path, bytes, {
        contentType: mimeType,
        upsert: false,
      });
      if (error) throw error;
      uploaded.push(path);
    }
    return uploaded;
  } catch (error) {
    if (uploaded.length) await supabase.storage.from('notice-images').remove(uploaded);
    throw error;
  }
}

export async function removeNoticeImages(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error } = await supabase.storage.from('notice-images').remove(paths);
  if (error) throw error;
}
