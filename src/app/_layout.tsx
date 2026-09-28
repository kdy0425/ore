import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/constants/theme';

export default function RootLayout() {
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
      </Stack>
    </>
  );
}
