import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { AuthShell } from '@/components/AuthShell';
import { AppButton } from '@/components/AppButton';
import { FormField } from '@/components/FormField';
import { colors, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { toUserMessage } from '@/lib/errors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (signInError) setError(toUserMessage(signInError));
    setLoading(false);
  };

  return (
    <AuthShell title="직원 로그인" description="승인된 오레노라멘 직원 계정으로 로그인해주세요.">
      <FormField
        label="이메일"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="name@example.com"
      />
      <FormField
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        placeholder="비밀번호"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton label="로그인" onPress={() => void submit()} loading={loading} />
      <Pressable onPress={() => router.push('/auth/forgot-password')}>
        <Text style={styles.link}>비밀번호를 잊으셨나요?</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/auth/signup')}>
        <Text style={styles.link}>계정이 없으신가요? 가입 신청</Text>
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  link: { color: colors.ink, fontSize: 14, fontWeight: '800', textAlign: 'center', padding: spacing.xs },
});
