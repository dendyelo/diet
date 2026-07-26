export interface ColorTokens {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfacePressed: string;
  divider: string;
  dividerSubtle: string;
  border: string;
  overlay: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySubtle: string;
  primaryText: string;
  success: string;
  successSubtle: string;
  info: string;
  infoSubtle: string;
  water: string;
  warning: string;
  warningSubtle: string;
  danger: string;
  dangerSubtle: string;
  weight: string;
  weightSubtle: string;
}

export const darkColors: ColorTokens = {
  background: '#09090B',
  surface: '#18181B',
  surfaceElevated: '#27272A',
  surfacePressed: '#3F3F46',
  divider: 'rgba(255, 255, 255, 0.08)',
  dividerSubtle: 'rgba(255, 255, 255, 0.04)',
  border: 'rgba(255, 255, 255, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.75)',
  textPrimary: '#FFFFFF',
  textSecondary: '#E4E4E7',
  textTertiary: 'rgba(255, 255, 255, 0.5)',
  textDisabled: 'rgba(255, 255, 255, 0.3)',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  primary: '#10B981', // Emerald Green
  primarySubtle: 'rgba(16, 185, 129, 0.15)',
  primaryText: '#34D399',
  success: '#10B981',
  successSubtle: 'rgba(16, 185, 129, 0.15)',
  info: '#3B82F6',
  infoSubtle: 'rgba(59, 130, 246, 0.15)',
  water: '#3B82F6',
  warning: '#F59E0B',
  warningSubtle: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444',
  dangerSubtle: 'rgba(239, 68, 68, 0.15)',
  weight: '#A855F7',
  weightSubtle: 'rgba(168, 85, 247, 0.15)',
};

export const lightColors: ColorTokens = {
  background: '#F7F7F5', // Off-white Notion style
  surface: '#FFFFFF',
  surfaceElevated: '#F4F4F5',
  surfacePressed: '#E4E4E7',
  divider: 'rgba(0, 0, 0, 0.08)',
  dividerSubtle: 'rgba(0, 0, 0, 0.04)',
  border: 'rgba(0, 0, 0, 0.08)',
  overlay: 'rgba(0, 0, 0, 0.4)',
  textPrimary: '#18181B',
  textSecondary: '#3F3F46',
  textTertiary: 'rgba(0, 0, 0, 0.5)',
  textDisabled: 'rgba(0, 0, 0, 0.3)',
  text: '#18181B',
  textMuted: 'rgba(0, 0, 0, 0.5)',
  primary: '#10B981',
  primarySubtle: 'rgba(16, 185, 129, 0.12)',
  primaryText: '#059669',
  success: '#10B981',
  successSubtle: 'rgba(16, 185, 129, 0.12)',
  info: '#2563EB',
  infoSubtle: 'rgba(37, 99, 235, 0.12)',
  water: '#2563EB',
  warning: '#D97706',
  warningSubtle: 'rgba(217, 119, 6, 0.12)',
  danger: '#DC2626',
  dangerSubtle: 'rgba(220, 38, 38, 0.12)',
  weight: '#9333EA',
  weightSubtle: 'rgba(147, 51, 234, 0.12)',
};
