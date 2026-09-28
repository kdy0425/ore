import { Platform } from 'react-native';

export const colors = {
  background: '#F7F5F2',
  surface: '#FFFFFF',
  surfaceMuted: '#F0EEEA',
  ink: '#171717',
  inkMuted: '#68635D',
  border: '#E2DED8',
  brand: '#D92D28',
  brandDark: '#A91E1A',
  brandSoft: '#FCE9E7',
  success: '#168451',
  successSoft: '#E7F6EE',
  danger: '#C7352F',
  dangerSoft: '#FCE8E6',
  warning: '#B06C08',
  black: '#090909',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const shadow = Platform.select({
  web: { boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' },
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  android: { elevation: 3 },
  default: { elevation: 3 },
});
