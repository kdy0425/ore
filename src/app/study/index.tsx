import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { SectionTitle } from '@/components/SectionTitle';
import { colors, radii, shadow, spacing } from '@/constants/theme';
import { getCategories, getQuestions } from '@/data/quizRepository';

export default function StudyCategoriesScreen() {
  const categories = getCategories();

  return (
    <Screen contentContainerStyle={styles.content}>
      <SectionTitle title="무엇을 공부할까요?" caption="문제은행의 카테고리가 자동으로 표시됩니다." />
      <View style={styles.grid}>
        {categories.map((category, index) => {
          const count = getQuestions({ categoryId: category.id }).length;
          return (
            <Pressable
              key={category.id}
              onPress={() => router.push({ pathname: '/study/category', params: { categoryId: category.id } })}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardTop}>
                <View style={styles.numberBadge}>
                  <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
                </View>
                <Text style={styles.count}>{count}문제</Text>
              </View>
              <Text style={styles.name}>{category.name}</Text>
              <Text style={styles.description} numberOfLines={2}>{category.description}</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.brand} />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  grid: { gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow,
  },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  numberBadge: { backgroundColor: colors.brandSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill },
  number: { color: colors.brandDark, fontSize: 12, fontWeight: '900' },
  count: { color: colors.inkMuted, fontSize: 13, fontWeight: '700' },
  name: { color: colors.ink, fontSize: 21, fontWeight: '900' },
  description: { color: colors.inkMuted, fontSize: 14, lineHeight: 20 },
});
