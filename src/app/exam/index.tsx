import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '@/components/AppButton';
import { Screen } from '@/components/Screen';
import { SectionTitle } from '@/components/SectionTitle';
import { colors, radii, spacing } from '@/constants/theme';
import { getCategories, getQuestions } from '@/data/quizRepository';
import { useLearningRecords } from '@/hooks/useLearningRecords';
import type { ExamMode } from '@/types/quiz';
import { shuffle } from '@/utils/quiz';

const EXAM_MODES: { id: ExamMode; title: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'all', title: '전체 랜덤', description: '모든 카테고리에서 출제', icon: 'shuffle' },
  { id: 'category', title: '카테고리별', description: '선택한 범위에서 출제', icon: 'albums-outline' },
  { id: 'wrong', title: '오답 문제', description: '틀린 기록이 있는 문제', icon: 'refresh-outline' },
];
const COUNTS = [10, 20, 30, 'all'] as const;

export default function ExamSetupScreen() {
  const [mode, setMode] = useState<ExamMode>('all');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [count, setCount] = useState<(typeof COUNTS)[number]>(10);
  const { records } = useLearningRecords();
  const categories = getCategories();

  const availableQuestions = useMemo(() => {
    if (mode === 'category') return categoryId ? getQuestions({ categoryId }) : [];
    if (mode === 'wrong') {
      const wrongIds = Object.values(records.questions)
        .filter((record) => record.wrongCount > 0)
        .sort((a, b) => b.wrongCount - a.wrongCount)
        .map((record) => record.questionId);
      const idSet = new Set(wrongIds);
      return getQuestions().filter((question) => idSet.has(question.id));
    }
    return getQuestions();
  }, [categoryId, mode, records.questions]);

  const canStart = availableQuestions.length > 0;
  const startExam = () => {
    if (!canStart) return;
    const shuffled = shuffle(availableQuestions);
    const selected = count === 'all' ? shuffled : shuffled.slice(0, count);
    router.push({
      pathname: '/exam/quiz',
      params: { mode, questionIds: selected.map((question) => question.id).join(',') },
    });
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <SectionTitle title="시험 설정" caption="시험 중에는 정답을 보여주지 않으며, 선택한 답은 바꿀 수 없습니다." />

      <View style={styles.modeList}>
        {EXAM_MODES.map((item) => {
          const active = mode === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setMode(item.id)}
              style={({ pressed }) => [styles.modeCard, active && styles.modeCardActive, pressed && styles.pressed]}
            >
              <View style={[styles.modeIcon, active && styles.modeIconActive]}>
                <Ionicons name={item.icon} size={22} color={active ? colors.white : colors.ink} />
              </View>
              <View style={styles.modeCopy}>
                <Text style={styles.modeTitle}>{item.title}</Text>
                <Text style={styles.modeDescription}>{item.description}</Text>
              </View>
              <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View>
            </Pressable>
          );
        })}
      </View>

      {mode === 'category' ? (
        <View style={styles.section}>
          <Text style={styles.label}>카테고리</Text>
          <View style={styles.chips}>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => setCategoryId(category.id)}
                style={[styles.chip, categoryId === category.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, categoryId === category.id && styles.chipTextActive]}>{category.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.label}>문제 개수</Text>
        <View style={styles.countRow}>
          {COUNTS.map((item) => {
            const active = count === item;
            return (
              <Pressable key={String(item)} onPress={() => setCount(item)} style={[styles.countChip, active && styles.countChipActive]}>
                <Text style={[styles.countText, active && styles.countTextActive]}>{item === 'all' ? '전체' : item}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.available}>현재 출제 가능 {availableQuestions.length}문제</Text>
      </View>

      {mode === 'wrong' && availableQuestions.length === 0 ? (
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={22} color={colors.warning} />
          <Text style={styles.noticeText}>아직 오답 기록이 없습니다. 먼저 공부나 시험을 진행해주세요.</Text>
        </View>
      ) : null}

      <AppButton label="시험 시작" icon="play" disabled={!canStart} onPress={startExam} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  modeList: { gap: spacing.sm },
  modeCard: { minHeight: 78, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  modeCardActive: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  modeIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  modeIconActive: { backgroundColor: colors.brand },
  modeCopy: { flex: 1, gap: 3 },
  modeTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  modeDescription: { color: colors.inkMuted, fontSize: 13 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.brand },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },
  section: { gap: spacing.sm },
  label: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 42, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md, justifyContent: 'center' },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  chipTextActive: { color: colors.white },
  countRow: { flexDirection: 'row', gap: spacing.sm },
  countChip: { flex: 1, minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  countChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  countText: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  countTextActive: { color: colors.white },
  available: { color: colors.inkMuted, fontSize: 12 },
  notice: { backgroundColor: '#FFF4DF', borderRadius: radii.md, padding: spacing.md, flexDirection: 'row', gap: spacing.sm },
  noticeText: { flex: 1, color: '#7C510C', fontSize: 13, lineHeight: 19 },
  pressed: { opacity: 0.76 },
});
