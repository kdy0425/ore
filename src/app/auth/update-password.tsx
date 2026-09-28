import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { AuthShell } from '@/components/AuthShell';
import { AppButton } from '@/components/AppButton';
import { FormField } from '@/components/FormField';
import { colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { toUserMessage } from '@/lib/errors';

export default function UpdatePasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (password.length < 8 || password !== confirm) {
      setError('8자 이상의 동일한 비밀번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) setError(toUserMessage(updateError));
    else Alert.alert('변경 완료', '새 비밀번호가 설정되었습니다.', [{ text: '확인', onPress: () => router.replace('/') }]);
    setLoading(false);
  };

  return (
    <AuthShell title="새 비밀번호 설정" description="앞으로 사용할 새 비밀번호를 입력해주세요.">
      <FormField label="새 비밀번호" value={password} onChangeText={setPassword} secureTextEntry placeholder="8자 이상" />
      <FormField label="비밀번호 확인" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="한 번 더 입력" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton label="비밀번호 변경" onPress={() => void submit()} loading={loading} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({ error: { color: colors.danger, fontSize: 13, textAlign: 'center' } });
