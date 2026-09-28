import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '@/components/AppButton';
import { Screen } from '@/components/Screen';
import { StatCard } from '@/components/StatCard';
import { colors, radii, spacing } from '@/constants/theme';
import { calculateAccuracy, formatPercent } from '@/utils/quiz';

type ResultParams = {
  scopeName?: string;
  total?: string;
  correct?: string;
  wrong?: string;
  categoryId?: string;
  subcategory?: string;
  questionIds?: string;
};

export default function StudyResultScreen() {
  const params = useLocalSearchParams<ResultParams>();
  const total = Number(params.total ?? 0);
  const correct = Number(params.correct ?? 0);
  const wrong = Number(params.wrong ?? 0);
  const attempts = correct + wrong;

  const restart = () => {
    router.replace({
      pathname: '/study/quiz',
      params: {
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
        ...(params.subcategory ? { subcategory: params.subcategory } : {}),
        ...(params.questionIds ? { questionIds: params.questionIds } : {}),
      },
    });
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.iconCircle}><Ionicons name="checkmark" size={38} color={colors.white} /></View>
        <Text style={styles.eyebrow}>{params.scopeName ?? '학습'}</Text>
        <Text style={styles.title}>학습 완료</Text>
        <Text style={styles.subtitle}>모든 문제의 정답을 확인했습니다.</Text>
      </View>

      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>전체 시도 기준 정답률</Text>
        <Text style={styles.score}>{formatPercent(calculateAccuracy(correct, wrong))}</Text>
        <Text style={styles.scoreCaption}>정답 {correct}회 ÷ 총 시도 {attempts}회</Text>
      </View>

      <View style={styles.stats}>
        <StatCard label="총 문제" value={total} />
        <StatCard label="정답" value={correct} accent />
        <StatCard label="오답 시도" value={wrong} />
        <StatCard label="총 시도" value={attempts} />
      </View>

      <View style={styles.actions}>
        <AppButton label="다시 공부하기" icon="refresh" onPress={restart} />
        <AppButton label="메인으로" variant="secondary" icon="home-outline" onPress={() => router.dismissAll()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  hero: { alignItems: 'center', gap: spacing.xs },
  iconCircle: { width: 74, height: 74, borderRadius: 37, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  eyebrow: { color: colors.brand, fontSize: 13, fontWeight: '900' },
  title: { color: colors.ink, fontSize: 31, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: colors.inkMuted, fontSize: 14 },
  scoreCard: { backgroundColor: colors.ink, borderRadius: radii.lg, alignItems: 'center', padding: spacing.lg, gap: spacing.xs },
  scoreLabel: { color: '#C8C3BD', fontSize: 13, fontWeight: '700' },
  score: { color: colors.white, fontSize: 47, fontWeight: '900', letterSpacing: -1.5 },
  scoreCaption: { color: '#C8C3BD', fontSize: 12 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
});
