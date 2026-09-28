export function toUserMessage(error: unknown, fallback = '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'): string {
  const message = error instanceof Error ? error.message : String(error ?? '');

  if (/invalid login credentials/i.test(message)) return '이메일 또는 비밀번호를 확인해주세요.';
  if (/email not confirmed/i.test(message)) return '이메일 인증을 완료한 뒤 로그인해주세요.';
  if (/user already registered/i.test(message)) return '이미 가입된 이메일입니다.';
  if (/email rate limit|over_email_send_rate_limit/i.test(message)) {
    return '메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
  }
  if (/password/i.test(message) && /characters|length|weak/i.test(message)) {
    return '비밀번호는 8자 이상으로 안전하게 입력해주세요.';
  }
  if (/access denied|permission denied|row-level security/i.test(message)) return '접근 권한이 없습니다.';
  if (/network|fetch/i.test(message)) return '네트워크 연결을 확인해주세요.';
  return fallback;
}
