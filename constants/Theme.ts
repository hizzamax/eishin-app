/**
 * デザインシステム（SPEC-v2.md 9章）
 * 白基調・ミニマル・プレミアム。青はアクセントのみに使う。
 */
export const Colors = {
  background: '#FFFFFF',
  subBackground: '#F7F8FA',
  card: '#FFFFFF',
  text: '#17191D',
  subText: '#777E87',
  border: '#E9EBEF',
  accent: '#4169E1',
  accentSoft: '#EEF2FF',
  danger: '#D64545',
  success: '#2E9E6B',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const FontSize = {
  caption: 12,
  small: 13,
  body: 15,
  lead: 17,
  title: 22,
  display: 28,
} as const;

export const Shadow = {
  shadowColor: '#17191D',
  shadowOpacity: 0.05,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
} as const;
