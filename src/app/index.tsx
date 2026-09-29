import { useEffect, useState } from 'react';
import { Animated, Easing, Image, ImageBackground, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MenuCard } from '@/components/MenuCard';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { canAccessAdmin } from '@/lib/permissions';
import { loadNotices, type NoticeWithRelations } from '@/services/notices';

export default function HomeScreen() {
  const [showIntro, setShowIntro] = useState(true);
  const [introImageLoaded, setIntroImageLoaded] = useState(false);
  const [introOpacity] = useState(() => new Animated.Value(1));
  const [recentNotices, setRecentNotices] = useState<NoticeWithRelations[]>([]);
  const { profile } = useAuth();

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

  useEffect(() => {
    void loadNotices(3).then(setRecentNotices).catch(() => undefined);
  }, []);

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
        <View style={styles.welcome}>
          <View>
            <Text style={styles.welcomeName}>{profile?.name}님, 안녕하세요.</Text>
            <Text style={styles.welcomeBranch}>{profile?.branch?.name ?? '오레노라멘'}</Text>
          </View>
          <Pressable onPress={() => router.push('/profile')} style={styles.profileButton}>
            <Text style={styles.profileButtonText}>설정</Text>
          </Pressable>
        </View>
        <ImageBackground
          source={require('../../assets/images/ramen-hero.jpg')}
          imageStyle={styles.heroImage}
          style={styles.hero}
        >
          <View style={styles.heroShade}>
            <Text style={styles.eyebrow}>ORENO RAMEN · STAFF TRAINING</Text>
            <View style={styles.titleRow}>
              <Text style={styles.heroTitle}>오레노라멘 학습</Text>
              <Text style={styles.staffTag}>(직원용)</Text>
            </View>
            <Text style={styles.heroCopy}>짧게, 반복해서, 확실하게 익혀보세요.</Text>
          </View>
        </ImageBackground>

        <View style={styles.noticeSection}>
          <View style={styles.noticeHeading}>
            <Text style={styles.noticeTitle}>최근 공지</Text>
            <Pressable onPress={() => router.push('/notices')}><Text style={styles.noticeMore}>전체보기</Text></Pressable>
          </View>
          {recentNotices.length === 0 ? <Text style={styles.noticeEmpty}>등록된 공지사항이 없습니다.</Text> : recentNotices.map((notice) => (
            <Pressable key={notice.id} onPress={() => router.push({ pathname: '/notices/[id]', params: { id: notice.id } })} style={styles.noticeRow}>
              <Text style={styles.noticeScope}>{notice.scope === 'global' ? '전체' : notice.branch?.name ?? '지점'}</Text>
              <Text style={styles.noticeRowTitle} numberOfLines={1}>{notice.title}</Text>
              {notice.notice_reads.length === 0 ? <View style={styles.unreadDot} /> : null}
            </Pressable>
          ))}
        </View>

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
          <MenuCard
            title="공지사항"
            description="전체공지와 소속 지점의 안내를 확인해요."
            icon="megaphone-outline"
            accent="#8B4AA8"
            onPress={() => router.push('/notices')}
          />
          {canAccessAdmin(profile) ? (
            <MenuCard
              title="관리"
              description="승인 대기, 직원 및 지점 통계를 관리해요."
              icon="settings-outline"
              accent="#B06C08"
              onPress={() => router.push('/admin')}
            />
          ) : null}
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
              <View style={styles.titleRow}>
                <Text style={styles.introTitle}>오레노라멘 학습</Text>
                <Text style={styles.introStaffTag}>(직원용)</Text>
              </View>
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
  welcome: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeName: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  welcomeBranch: { color: colors.inkMuted, fontSize: 12, marginTop: 3 },
  profileButton: { backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, paddingHorizontal: 13, paddingVertical: 8 },
  profileButtonText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  hero: { height: 214, justifyContent: 'flex-end' },
  heroImage: { borderRadius: radii.lg },
  heroShade: {
    padding: spacing.lg,
    paddingTop: 64,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  eyebrow: { color: '#F5C8C4', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  heroTitle: { color: colors.white, fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  staffTag: { color: colors.white, backgroundColor: colors.brand, fontSize: 12, fontWeight: '900', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  heroCopy: { color: '#F5F5F5', fontSize: 14, marginTop: 5 },
  menuList: { gap: spacing.md },
  noticeSection: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.md, gap: spacing.xs },
  noticeHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  noticeTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  noticeMore: { color: colors.brand, fontSize: 12, fontWeight: '800' },
  noticeEmpty: { color: colors.inkMuted, fontSize: 13, paddingVertical: spacing.sm },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  noticeScope: { color: colors.brand, fontSize: 10, fontWeight: '900', width: 54 },
  noticeRowTitle: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand },
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
  introTitle: { color: colors.white, fontSize: 34, fontWeight: '900', letterSpacing: -1.2 },
  introStaffTag: { color: colors.white, backgroundColor: colors.brand, fontSize: 13, fontWeight: '900', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6, overflow: 'hidden' },
  introCopy: { color: '#F1EFEC', fontSize: 15, fontWeight: '600', marginTop: 8 },
});
