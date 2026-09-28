import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: '800' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: '관리' }} />
      <Stack.Screen name="applications" options={{ title: '승인 대기' }} />
      <Stack.Screen name="employees" options={{ title: '직원 관리' }} />
      <Stack.Screen name="employee/[id]" options={{ title: '직원 상세' }} />
      <Stack.Screen name="branches" options={{ title: '지점 관리' }} />
      <Stack.Screen name="stats" options={{ title: '통계' }} />
      <Stack.Screen name="recipes" options={{ title: '레시피 데이터 관리' }} />
      <Stack.Screen name="notices" options={{ title: '공지사항 관리' }} />
      <Stack.Screen name="notice-form" options={{ title: '공지 작성' }} />
      <Stack.Screen name="audit" options={{ title: '관리자 작업이력' }} />
    </Stack>
  );
}
