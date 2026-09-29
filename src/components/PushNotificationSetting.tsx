import { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, radii, spacing } from '@/constants/theme';
import { toUserMessage } from '@/lib/errors';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushSettingsState,
  PushPermissionDeniedError,
} from '@/services/pushNotifications';

interface PushNotificationSettingProps {
  description?: string;
}

export function PushNotificationSetting({
  description = '새 공지, 가입 심사 결과와 직원 등급 변경 소식을 받습니다.',
}: PushNotificationSettingProps) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    void getPushSettingsState()
      .then((state) => setEnabled(state.enabled))
      .finally(() => setBusy(false));
  }, []);

  const toggle = async (nextEnabled: boolean) => {
    setBusy(true);
    try {
      if (nextEnabled) await enablePushNotifications();
      else await disablePushNotifications();
      setEnabled(nextEnabled);
    } catch (error) {
      if (error instanceof PushPermissionDeniedError) {
        Alert.alert('알림 권한이 꺼져 있습니다', '기기 설정에서 알림 권한을 허용한 뒤 다시 시도해주세요.', [
          { text: '취소', style: 'cancel' },
          { text: '설정 열기', onPress: () => void Linking.openSettings() },
        ]);
      } else {
        Alert.alert('알림 설정 실패', toUserMessage(error, '잠시 후 다시 시도해주세요.'));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.copy}>
          <Text style={styles.title}>알림 받기</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <Switch
          accessibilityLabel="알림 받기"
          value={enabled}
          disabled={busy}
          onValueChange={(value) => void toggle(value)}
          trackColor={{ false: colors.border, true: '#D8898D' }}
          thumbColor={enabled ? colors.brand : colors.white}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  copy: { flex: 1, gap: 4 },
  title: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  description: { color: colors.inkMuted, fontSize: 12, lineHeight: 18 },
});
