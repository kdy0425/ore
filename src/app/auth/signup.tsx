import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { AuthShell } from '@/components/AuthShell';
import { AppButton } from '@/components/AppButton';
import { FormField } from '@/components/FormField';
import { colors, radii, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { toUserMessage } from '@/lib/errors';
import type { Branch } from '@/types/auth';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase
      .from('branches')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data, error: branchError }) => {
        if (branchError) setError('지점 목록을 불러오지 못했습니다.');
        else setBranches(data ?? []);
      });
  }, []);

  const submit = async () => {
    if (!name.trim() || !email.trim() || password.length < 8 || !phoneNumber.trim() || !branchId) {
      setError('이름, 이메일, 휴대폰 번호, 8자 이상의 비밀번호, 소속 지점을 모두 입력해주세요.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('비밀번호와 비밀번호 재확인이 일치하지 않습니다.');
      return;
    }
    if (!/^\+?[0-9 -]{8,20}$/.test(phoneNumber.trim())) {
      setError('휴대폰 번호를 올바르게 입력해주세요.');
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: signupError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { name: name.trim(), phone_number: phoneNumber.trim(), requested_branch_id: branchId },
        emailRedirectTo: Linking.createURL('/auth/login'),
      },
    });

    if (signupError) {
      setError(toUserMessage(signupError));
      setLoading(false);
      return;
    }

    Alert.alert(
      '가입 신청 완료',
      data.session
        ? '가입 신청이 완료되었습니다. 관리자 승인 후 이용할 수 있습니다.'
        : '가입 신청이 완료되었습니다. 이메일 인증 후 로그인해주세요.',
      [{ text: '확인', onPress: () => router.replace(data.session ? '/account-status' : '/auth/login') }],
    );
    setLoading(false);
  };

  return (
    <AuthShell title="가입 신청" description="소속 지점을 선택해 신청하면 관리자 승인 후 이용할 수 있습니다.">
      <FormField label="이름" value={name} onChangeText={setName} autoComplete="name" placeholder="이름" />
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
        label="휴대폰 번호"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        autoComplete="tel"
        keyboardType="phone-pad"
        placeholder="010-1234-5678"
      />
      <FormField
        label="비밀번호"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        placeholder="8자 이상"
      />
      <FormField
        label="비밀번호 재확인"
        value={passwordConfirm}
        onChangeText={setPasswordConfirm}
        secureTextEntry
        autoComplete="new-password"
        placeholder="비밀번호를 다시 입력"
      />
      <View style={styles.branchSection}>
        <Text style={styles.label}>소속 지점</Text>
        <View style={styles.branchList}>
          {branches.map((branch) => (
            <Pressable
              key={branch.id}
              onPress={() => setBranchId(branch.id)}
              style={[styles.branch, branchId === branch.id ? styles.branchSelected : null]}
            >
              <Text style={[styles.branchText, branchId === branch.id ? styles.branchTextSelected : null]}>
                {branch.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AppButton label="가입 신청" onPress={() => void submit()} loading={loading} />
      <Pressable onPress={() => router.replace('/auth/login')}>
        <Text style={styles.loginLink}>로그인으로 돌아가기</Text>
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  branchSection: { gap: spacing.xs },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  branchList: { gap: spacing.xs },
  branch: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  branchSelected: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  branchText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  branchTextSelected: { color: colors.brand },
  error: { color: colors.danger, fontSize: 13, textAlign: 'center' },
  loginLink: { color: colors.ink, fontSize: 14, fontWeight: '800', textAlign: 'center', padding: spacing.xs },
});
