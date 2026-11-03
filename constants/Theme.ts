/**
 * デザインシステム
 * 白基調・プレミアム・モダン（2026-11-03 デザイン刷新）。
 * アクセントはコーラルオレンジを中心に、補助にやわらかいブルー。
 * 色はここに集約し、ダークモード対応時はこのトークンを差し替える。
 */
export const Colors = {
  background: '#FFFFFF',
  subBackground: '#F5F5F5',
  card: '#FFFFFF',
  text: '#202124',
  subText: '#858585',
  border: '#EEEEEE',
  accent: '#F28C65',
  accentSub: '#F5B18E',
  accentSoft: '#FFF0E8',
  blue: '#7189B8',
  blueSoft: '#EDF1F8',
  dark: '#202124',
  danger: '#D64545',
  dangerSoft: '#FDECEC',
  success: '#2E9E6B',
  successSoft: '#E7F5EE',
  white: '#FFFFFF',
  sunday: '#D97B8C',
  tabInactive: '#B9B9B9',
} as const;

/** ヒーローカード用グラデーション（コーラル→ピーチ） */
export const HeroGradient = ['#F28C65', '#F5B18E'] as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const FontSize = {
  caption: 12,
  small: 13,
  body: 15,
  lead: 17,
  title: 22,
  display: 28,
  hero: 34,
} as const;

/** 柔らかく自然な影（カード用） */
export const Shadow = {
  shadowColor: '#202124',
  shadowOpacity: 0.07,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
} as const;

/** ヒーローカード用（コーラルの影） */
export const HeroShadow = {
  shadowColor: '#F28C65',
  shadowOpacity: 0.35,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
} as const;
