import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { SectionTitle } from '@/components/SectionTitle';
import { colors, radii, spacing } from '@/constants/theme';
import { getCategory, getQuestions, getSubcategories } from '@/data/quizRepository';

export default function StudyScopeScreen() {
  const { categoryId = '' } = useLocalSearchParams<{ categoryId: string }>();
  const category = getCategory(categoryId);
  const subcategories = getSubcategories(categoryId);

  if (!category) {
    return (
      <Screen contentContainerStyle={styles.content}>
        <SectionTitle title="카테고리를 찾을 수 없습니다." />
      </Screen>
    );
  }

  const startStudy = (subcategory?: string) => {
    router.push({
      pathname: '/study/quiz',
      params: { categoryId, ...(subcategory ? { subcategory } : {}) },
    });
  };

  return (
    <Screen contentContainerStyle={styles.content}>
      <SectionTitle title={category.name} caption={category.description} />
      <Pressable onPress={() => startStudy()} style={({ pressed }) => [styles.allCard, pressed && styles.pressed]}>
        <View>
          <Text style={styles.allLabel}>전체 학습</Text>
          <Text style={styles.allCount}>{getQuestions({ categoryId }).length}문제를 순서대로 학습합니다.</Text>
        </View>
        <Ionicons name="play-circle" size={34} color={colors.white} />
      </Pressable>

      <Text style={styles.subheading}>세부 카테고리</Text>
      <View style={styles.list}>
        {subcategories.map((subcategory) => (
          <Pressable
            key={subcategory}
            onPress={() => startStudy(subcategory)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.rowIcon}><Ionicons name="restaurant-outline" size={19} color={colors.brand} /></View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>{subcategory}</Text>
              <Text style={styles.rowCount}>{getQuestions({ categoryId, subcategory }).length}문제</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.inkMuted} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  allCard: {
    minHeight: 94,
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  allLabel: { color: colors.white, fontSize: 21, fontWeight: '900' },
  allCount: { color: '#FFE8E5', fontSize: 13, marginTop: 5 },
  subheading: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: spacing.xs },
  list: { gap: spacing.sm },
  row: {
    minHeight: 72,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, gap: 3 },
  rowTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  rowCount: { color: colors.inkMuted, fontSize: 13 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
});
