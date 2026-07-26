export interface ColorTokens {
  background: string;
  surface: string;
  surfaceElevated: string;
  divider: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySubtle: string;
  primaryText: string;
  success: string;
  info: string;
  infoSubtle: string;
  water: string;
  warning: string;
  warningSubtle: string;
  danger: string;
  weight: string;
  weightSubtle: string;
}

export const darkColors: ColorTokens = {
  background: '#09090B',
  surface: '#18181B',
  surfaceElevated: '#27272A',
  divider: 'rgba(255, 255, 255, 0.08)',
  border: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#FFFFFF',
  textSecondary: '#E4E4E7',
  textTertiary: 'rgba(255, 255, 255, 0.5)',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  primary: '#10B981', // Emerald Green
  primarySubtle: 'rgba(16, 185, 129, 0.15)',
  primaryText: '#34D399',
  success: '#10B981',
  info: '#3B82F6',
  infoSubtle: 'rgba(59, 130, 246, 0.15)',
  water: '#3B82F6',
  warning: '#F59E0B',
  warningSubtle: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444',
  weight: '#A855F7',
  weightSubtle: 'rgba(168, 85, 247, 0.15)',
};

export const lightColors: ColorTokens = {
  background: '#F7F7F5', // Off-white Notion style
  surface: '#FFFFFF',
  surfaceElevated: '#F4F4F5',
  divider: 'rgba(0, 0, 0, 0.08)',
  border: 'rgba(0, 0, 0, 0.08)',
  textPrimary: '#18181B',
  textSecondary: '#3F3F46',
  textTertiary: 'rgba(0, 0, 0, 0.5)',
  text: '#18181B',
  textMuted: 'rgba(0, 0, 0, 0.5)',
  primary: '#10B981',
  primarySubtle: 'rgba(16, 185, 129, 0.12)',
  primaryText: '#059669',
  success: '#10B981',
  info: '#2563EB',
  infoSubtle: 'rgba(37, 99, 235, 0.12)',
  water: '#2563EB',
  warning: '#D97706',
  warningSubtle: 'rgba(217, 119, 6, 0.12)',
  danger: '#DC2626',
  weight: '#9333EA',
  weightSubtle: 'rgba(147, 51, 234, 0.12)',
};
