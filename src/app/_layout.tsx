import { useEffect, useRef } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { Alert, Linking, Platform, View } from 'react-native';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { StateView } from '@/components/StateView';
import { canAccessAdmin } from '@/lib/permissions';
import {
  enablePushNotifications,
  hasSeenPushOnboarding,
  markPushOnboardingSeen,
  notificationUrl,
  PushPermissionDeniedError,
  syncPushRegistration,
} from '@/services/pushNotifications';

function AppNavigator() {
  const segments = useSegments() as string[];
  const { loading, session, profile, profileError } = useAuth();
  const pushPromptStarted = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return undefined;

    const redirect = (notification: Notifications.Notification) => {
      const url = notificationUrl(notification);
      if (url) router.push(url as never);
    };
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) redirect(lastResponse.notification);
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      redirect(response.notification);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!session || !profile) return;
    void syncPushRegistration().catch(() => undefined);

    if (pushPromptStarted.current || (Platform.OS !== 'android' && Platform.OS !== 'ios')) return;
    pushPromptStarted.current = true;
    void hasSeenPushOnboarding().then((seen) => {
      if (seen) return;
      Alert.alert(
        '알림을 받아보세요',
        '새 공지, 가입 심사 결과와 직원 등급 변경 소식을 알려드립니다. 알림은 설정에서 언제든 끌 수 있습니다.',
        [
          { text: '나중에', style: 'cancel', onPress: () => void markPushOnboardingSeen() },
          {
            text: '알림 받기',
            onPress: () => {
              void markPushOnboardingSeen();
              void enablePushNotifications().catch((error) => {
                if (error instanceof PushPermissionDeniedError) {
                  Alert.alert('알림 권한이 꺼져 있습니다', '기기 설정에서 알림 권한을 허용해주세요.', [
                    { text: '취소', style: 'cancel' },
                    { text: '설정 열기', onPress: () => void Linking.openSettings() },
                  ]);
                  return;
                }
                Alert.alert('알림 설정 실패', error instanceof Error ? error.message : '잠시 후 다시 시도해주세요.');
              });
            },
          },
        ],
      );
    });
  }, [profile, session]);

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
        <Stack.Screen name="profile" options={{ title: '설정' }} />
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
