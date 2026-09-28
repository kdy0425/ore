import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { AuthShell } from '@/components/AuthShell';
import { AppButton } from '@/components/AppButton';
import { FormField } from '@/components/FormField';
import { colors, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { toUserMessage } from '@/lib/errors';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim()) return setError('이메일을 입력해주세요.');
    setLoading(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: Linking.createURL('/auth/update-password'),
    });
    if (resetError) setError(toUserMessage(resetError));
    else Alert.alert('메일 전송 완료', '비밀번호 재설정 링크를 이메일로 보냈습니다.');
    setLoading(false);
  };

  return (
    <AuthShell title="비밀번호 찾기" description="가입한 이메일로 비밀번호 재설정 링크를 보내드립니다.">
      <FormField
        label="이메일"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="name@example.com"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton label="재설정 메일 보내기" onPress={() => void submit()} loading={loading} />
      <Pressable onPress={() => router.replace('/auth/login')}>
        <Text style={styles.link}>로그인으로 돌아가기</Text>
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  link: { color: colors.ink, fontSize: 14, fontWeight: '800', textAlign: 'center', padding: spacing.xs },
});
