import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

const PREFERENCE_KEY = '@ore/push-enabled';
const TOKEN_KEY = '@ore/expo-push-token';
const ONBOARDING_KEY = '@ore/push-onboarding-seen';

export const PUSH_CHANNEL_ID = 'general';

export class PushPermissionDeniedError extends Error {
  constructor() {
    super('알림 권한이 허용되지 않았습니다.');
    this.name = 'PushPermissionDeniedError';
  }
}

if (Platform.OS === 'android' || Platform.OS === 'ios') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

function isSupportedPlatform(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

function isPermissionGranted(permission: Notifications.NotificationPermissionsStatus): boolean {
  if (permission.granted || permission.status === 'granted') return true;
  if (Platform.OS !== 'ios' || !permission.ios) return false;
  return [
    Notifications.IosAuthorizationStatus.AUTHORIZED,
    Notifications.IosAuthorizationStatus.PROVISIONAL,
    Notifications.IosAuthorizationStatus.EPHEMERAL,
  ].includes(permission.ios.status);
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
    name: '일반 알림',
    description: '새 공지, 가입 심사 결과와 직원 등급 변경 알림',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#B6292F',
  });
}

async function getPushToken(): Promise<string> {
  if (!Device.isDevice) throw new Error('푸시 알림은 실제 기기에서 설정할 수 있습니다.');
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== 'string' || !projectId) {
    throw new Error('푸시 알림 프로젝트 정보가 없습니다.');
  }
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

async function registerCurrentDevice(): Promise<string> {
  const token = await getPushToken();
  const { error } = await supabase.rpc('register_push_token', {
    push_token: token,
    device_platform: Platform.OS,
  });
  if (error) throw error;
  await AsyncStorage.multiSet([
    [PREFERENCE_KEY, 'true'],
    [TOKEN_KEY, token],
  ]);
  return token;
}

export async function getPushSettingsState(): Promise<{ enabled: boolean; permissionGranted: boolean }> {
  if (!isSupportedPlatform()) return { enabled: false, permissionGranted: false };
  const [preference, permission] = await Promise.all([
    AsyncStorage.getItem(PREFERENCE_KEY),
    Notifications.getPermissionsAsync(),
  ]);
  const permissionGranted = isPermissionGranted(permission);
  return { enabled: preference === 'true' && permissionGranted, permissionGranted };
}

export async function enablePushNotifications(): Promise<void> {
  if (!isSupportedPlatform()) throw new Error('이 기기에서는 푸시 알림을 지원하지 않습니다.');
  await ensureAndroidChannel();

  let permission = await Notifications.getPermissionsAsync();
  if (!isPermissionGranted(permission)) permission = await Notifications.requestPermissionsAsync();
  if (!isPermissionGranted(permission)) throw new PushPermissionDeniedError();

  await registerCurrentDevice();
}

export async function disablePushNotifications(): Promise<void> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    const { error } = await supabase.rpc('unregister_push_token', { push_token: token });
    if (error) throw error;
  }
  await AsyncStorage.multiRemove([PREFERENCE_KEY, TOKEN_KEY]);
}

export async function syncPushRegistration(): Promise<void> {
  if (!isSupportedPlatform()) return;
  const preference = await AsyncStorage.getItem(PREFERENCE_KEY);
  if (preference !== 'true') return;
  await ensureAndroidChannel();
  const permission = await Notifications.getPermissionsAsync();
  if (!isPermissionGranted(permission)) return;
  await registerCurrentDevice();
}

export async function unregisterPushTokenForCurrentDevice(): Promise<void> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return;
  const { error } = await supabase.rpc('unregister_push_token', { push_token: token });
  if (error) throw error;
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function hasSeenPushOnboarding(): Promise<boolean> {
  return (await AsyncStorage.getItem(ONBOARDING_KEY)) === 'true';
}

export async function markPushOnboardingSeen(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

export function notificationUrl(notification: Notifications.Notification): string | null {
  const value = notification.request.content.data?.url;
  if (typeof value !== 'string') return null;
  if (/^\/notices\/[0-9a-f-]+$/i.test(value)) return value;
  if (['/admin/applications', '/profile', '/account-status'].includes(value)) return value;
  return null;
}
