import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AppButton } from '@/components/AppButton';
import { FormField } from '@/components/FormField';
import { Screen } from '@/components/Screen';
import { StateView } from '@/components/StateView';
import { colors, radii, spacing } from '@/constants/theme';
import { getQuizBank, getRecipeVersion, parseQuizBankText, uploadQuizBank } from '@/data/quizRepository';
import { toUserMessage } from '@/lib/errors';
import { isDeveloper } from '@/lib/permissions';
import { useAuth } from '@/providers/AuthProvider';
import type { QuizBank } from '@/types/quiz';

export default function RecipeManagementScreen() {
  const { profile } = useAuth();
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<QuizBank | null>(null);
  const [version, setVersion] = useState(getRecipeVersion());
  const [busy, setBusy] = useState(false);

  if (!isDeveloper(profile)) return <StateView title="개발자 계정만 레시피를 변경할 수 있습니다." />;

  const validate = (source = text) => {
    try {
      const parsed = parseQuizBankText(source);
      setPreview(parsed);
      return parsed;
    } catch (error) {
      setPreview(null);
      Alert.alert('JSON 확인 실패', toUserMessage(error, 'JSON 형식과 필수 항목을 확인해주세요.'));
      return null;
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/json', 'text/plain'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const contents = asset.file ? await asset.file.text() : await FileSystem.readAsStringAsync(asset.uri);
    setText(contents);
    setFileName(asset.name);
    validate(contents);
  };

  const upload = () => {
    const parsed = validate();
    if (!parsed) return;
    Alert.alert(
      '레시피 전체 교체',
      `${parsed.questions.length}개 문제를 새 버전으로 적용하시겠습니까? 기존 버전은 이력으로 보관됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '전체 교체',
          onPress: async () => {
            setBusy(true);
            try {
              const uploaded = await uploadQuizBank(parsed);
              setVersion(uploaded.version);
              Alert.alert('업데이트 완료', `레시피 버전 ${uploaded.version}이 즉시 적용되었습니다.`);
            } catch (error) {
              Alert.alert('업데이트 실패', toUserMessage(error));
            } finally { setBusy(false); }
          },
        },
      ],
    );
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>현재 레시피 {version ? `v${version}` : '앱 기본본'}</Text>
        <Text style={styles.infoText}>JSON 파일 하나를 선택하거나 전체 내용을 아래에 붙여넣으세요. 적용 즉시 모든 직원에게 같은 버전이 제공됩니다.</Text>
      </View>
      <AppButton label="JSON 파일 선택" icon="document-attach-outline" variant="secondary" onPress={() => void pickFile()} />
      <AppButton
        label="현재 JSON 불러오기"
        variant="secondary"
        onPress={() => {
          const current = getQuizBank();
          setText(JSON.stringify(current, null, 2));
          setFileName(`recipe-v${version ?? 'local'}.json`);
          setPreview(current);
        }}
      />
      {fileName ? <Text style={styles.file}>선택: {fileName}</Text> : null}
      <FormField
        label="레시피 JSON 전체"
        value={text}
        onChangeText={(value) => { setText(value); setPreview(null); }}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={'{ "meta": ..., "categories": [...], "questions": [...] }'}
        style={styles.editor}
      />
      {preview ? (
        <View style={styles.validCard}>
          <Text style={styles.validTitle}>JSON 확인 완료</Text>
          <Text style={styles.validText}>카테고리 {preview.categories.length}개 · 문제 {preview.questions.length}개</Text>
        </View>
      ) : null}
      <View style={styles.actions}>
        <View style={styles.flex}><AppButton label="형식 확인" variant="secondary" onPress={() => validate()} /></View>
        <View style={styles.flex}><AppButton label="전체 업데이트" onPress={upload} loading={busy} disabled={!text.trim()} /></View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingBottom: spacing.xxl },
  infoCard: { backgroundColor: colors.ink, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xs },
  infoTitle: { color: colors.white, fontSize: 20, fontWeight: '900' },
  infoText: { color: '#D8D4CF', fontSize: 13, lineHeight: 20 },
  file: { color: colors.inkMuted, fontSize: 12 },
  editor: { minHeight: 320, fontFamily: 'monospace', fontSize: 12 },
  validCard: { backgroundColor: colors.successSoft, borderRadius: radii.md, padding: spacing.md, gap: 3 },
  validTitle: { color: colors.success, fontSize: 14, fontWeight: '900' },
  validText: { color: colors.inkMuted, fontSize: 12 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
