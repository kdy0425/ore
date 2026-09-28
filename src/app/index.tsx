import { useEffect, useState } from 'react';
import { Animated, Easing, Image, ImageBackground, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MenuCard } from '@/components/MenuCard';
import { colors, radii, spacing } from '@/constants/theme';

export default function HomeScreen() {
  const [showIntro, setShowIntro] = useState(true);
  const [introImageLoaded, setIntroImageLoaded] = useState(false);
  const [introOpacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!introImageLoaded) return undefined;

    let animation: Animated.CompositeAnimation | undefined;
    const timer = setTimeout(() => {
      animation = Animated.timing(introOpacity, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      });
      animation.start(({ finished }) => {
        if (finished) setShowIntro(false);
      });
    }, 1800);

    return () => {
      clearTimeout(timer);
      animation?.stop();
    };
  }, [introImageLoaded, introOpacity]);

  return (
    <View style={styles.page}>
      <StatusBar style={showIntro ? 'light' : 'dark'} />
      <SafeAreaView edges={['top']} style={styles.brandArea}>
        <Image
          source={require('../../assets/images/oreno-header.png')}
          resizeMode="contain"
          style={styles.brandImage}
          accessibilityLabel="오레노라멘 로고"
        />
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={require('../../assets/images/ramen-hero.jpg')}
          imageStyle={styles.heroImage}
          style={styles.hero}
        >
          <View style={styles.heroShade}>
            <Text style={styles.eyebrow}>ORENO RAMEN · STAFF TRAINING</Text>
            <Text style={styles.heroTitle}>오레노라멘 학습</Text>
            <Text style={styles.heroCopy}>짧게, 반복해서, 확실하게 익혀보세요.</Text>
          </View>
        </ImageBackground>

        <View style={styles.menuList}>
          <MenuCard
            title="공부하기"
            description="카테고리를 선택하고 정답을 맞힐 때까지 반복 학습해요."
            icon="book-outline"
            onPress={() => router.push('/study')}
          />
          <MenuCard
            title="시험보기"
            description="랜덤 문제로 실력을 점검하고 틀린 문제를 다시 확인해요."
            icon="document-text-outline"
            accent="#2D5B9B"
            onPress={() => router.push('/exam')}
          />
          <MenuCard
            title="나의 학습기록"
            description="누적 정답률과 자주 틀리는 문제를 한눈에 확인해요."
            icon="stats-chart-outline"
            accent={colors.success}
            onPress={() => router.push('/records')}
          />
        </View>
        <Text style={styles.footer}>오늘도 맛의 기준을 함께 지켜요.</Text>
      </ScrollView>

      {showIntro ? (
        <Animated.View style={[styles.intro, { opacity: introOpacity }]}>
          <ImageBackground
            source={require('../../assets/images/ramen-hero.jpg')}
            resizeMode="cover"
            style={styles.introImage}
            onLoad={() => setIntroImageLoaded(true)}
          >
            <View style={styles.introShade}>
              <Text style={styles.introEyebrow}>ORENO RAMEN</Text>
              <Text style={styles.introTitle}>오레노라멘 학습</Text>
              <Text style={styles.introCopy}>맛의 기준을 익히는 시간</Text>
            </View>
          </ImageBackground>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  brandArea: { backgroundColor: colors.white, paddingVertical: 12 },
  brandImage: { width: '100%', height: 50 },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  hero: { height: 214, justifyContent: 'flex-end' },
  heroImage: { borderRadius: radii.lg },
  heroShade: {
    padding: spacing.lg,
    paddingTop: 64,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  eyebrow: { color: '#F5C8C4', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { color: colors.white, fontSize: 30, fontWeight: '900', letterSpacing: -1, marginTop: 6 },
  heroCopy: { color: '#F5F5F5', fontSize: 14, marginTop: 5 },
  menuList: { gap: spacing.md },
  footer: { textAlign: 'center', color: colors.inkMuted, fontSize: 13, marginTop: spacing.sm },
  intro: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    backgroundColor: colors.black,
  },
  introImage: { width: '100%', height: '100%', justifyContent: 'flex-end' },
  introShade: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 72,
    paddingTop: 180,
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  introEyebrow: { color: '#F3AAA4', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  introTitle: { color: colors.white, fontSize: 34, fontWeight: '900', letterSpacing: -1.2, marginTop: 8 },
  introCopy: { color: '#F1EFEC', fontSize: 15, fontWeight: '600', marginTop: 8 },
});
