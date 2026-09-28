import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { StateView } from '@/components/StateView';
import { canAccessAdmin } from '@/lib/permissions';

function AppNavigator() {
  const segments = useSegments() as string[];
  const { loading, session, profile, profileError } = useAuth();

  useEffect(() => {
    if (loading) return;

    const root = segments[0];
    const authRoute = root === 'auth';
    const passwordRoute = authRoute && segments[1] === 'update-password';
    const statusRoute = root === 'account-status';

    if (!session && !authRoute) {
      router.replace('/auth/login');
      return;
    }

    if (session && !profile && profileError && !statusRoute && !passwordRoute) {
      router.replace('/account-status');
      return;
    }
    if (session && !profile) return;
    if (session && profile?.status !== 'active' && !statusRoute && !passwordRoute) {
      router.replace('/account-status');
      return;
    }

    if (session && profile?.status === 'active' && (statusRoute || (authRoute && !passwordRoute))) {
      router.replace('/');
      return;
    }

    if (root === 'admin' && !canAccessAdmin(profile)) router.replace('/');
  }, [loading, profile, profileError, segments, session]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StateView loading title="계정 정보를 확인하고 있습니다" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: colors.background },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="account-status" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="study/index" options={{ title: '공부하기' }} />
        <Stack.Screen name="study/category" options={{ title: '학습 범위 선택' }} />
        <Stack.Screen name="study/quiz" options={{ title: '공부하기', gestureEnabled: false }} />
        <Stack.Screen name="study/result" options={{ title: '학습 결과', gestureEnabled: false }} />
        <Stack.Screen name="exam/index" options={{ title: '시험보기' }} />
        <Stack.Screen name="exam/quiz" options={{ title: '시험보기', gestureEnabled: false }} />
        <Stack.Screen name="exam/result" options={{ title: '시험 결과', gestureEnabled: false }} />
        <Stack.Screen name="exam/review" options={{ title: '오답 확인' }} />
        <Stack.Screen name="records/index" options={{ title: '나의 학습기록' }} />
        <Stack.Screen name="notices/index" options={{ title: '공지사항' }} />
        <Stack.Screen name="notices/[id]" options={{ title: '공지 상세' }} />
        <Stack.Screen name="profile" options={{ title: '내 정보' }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
