export interface ColorTokens {
  background: string;
  surface: string;
  surfaceSubtle: string;
  border: string;
  borderSubtle: string;
  primary: string;
  primarySubtle: string;
  primaryText: string;
  water: string;
  waterSubtle: string;
  weight: string;
  weightSubtle: string;
  warning: string;
  warningSubtle: string;
  danger: string;
  text: string;
  textSecondary: string;
  textMuted: string;
}

export const darkColors: ColorTokens = {
  background: '#09090B',
  surface: '#18181B',
  surfaceSubtle: '#27272A',
  border: 'rgba(255, 255, 255, 0.08)',
  borderSubtle: 'rgba(255, 255, 255, 0.04)',
  primary: '#10B981', // Emerald Green
  primarySubtle: 'rgba(16, 185, 129, 0.15)',
  primaryText: '#34D399',
  water: '#3B82F6',
  waterSubtle: 'rgba(59, 130, 246, 0.15)',
  weight: '#A855F7',
  weightSubtle: 'rgba(168, 85, 247, 0.15)',
  warning: '#F59E0B',
  warningSubtle: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444',
  text: '#FFFFFF',
  textSecondary: '#E4E4E7',
  textMuted: 'rgba(255, 255, 255, 0.5)',
};

export const lightColors: ColorTokens = {
  background: '#F7F7F5', // Off-white Notion style
  surface: '#FFFFFF',
  surfaceSubtle: '#F4F4F5',
  border: 'rgba(0, 0, 0, 0.08)',
  borderSubtle: 'rgba(0, 0, 0, 0.04)',
  primary: '#10B981',
  primarySubtle: 'rgba(16, 185, 129, 0.12)',
  primaryText: '#059669',
  water: '#2563EB',
  waterSubtle: 'rgba(37, 99, 235, 0.12)',
  weight: '#9333EA',
  weightSubtle: 'rgba(147, 51, 234, 0.12)',
  warning: '#D97706',
  warningSubtle: 'rgba(217, 119, 6, 0.12)',
  danger: '#DC2626',
  text: '#18181B',
  textSecondary: '#3F3F46',
  textMuted: 'rgba(0, 0, 0, 0.5)',
};
