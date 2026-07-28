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
  onPrimary: string;
  success: string;
  successSubtle: string;
  onSuccess: string;
  info: string;
  infoSubtle: string;
  onInfo: string;
  water: string;
  warning: string;
  warningSubtle: string;
  onWarning: string;
  danger: string;
  dangerSubtle: string;
  onDanger: string;
  weight: string;
  weightSubtle: string;
  onSurface: string;
}

export const darkColors: ColorTokens = {
  background: '#000000',
  surface: '#111113',
  surfaceElevated: '#1C1C1E',
  surfacePressed: '#2C2C2E',
  divider: '#2C2C2E',
  dividerSubtle: 'rgba(255, 255, 255, 0.05)',
  border: '#2C2C2E',
  overlay: 'rgba(0, 0, 0, 0.75)',
  textPrimary: '#F5F5F7',
  textSecondary: '#D1D1D6',
  textTertiary: '#8E8E93',
  textDisabled: '#48484A',
  text: '#F5F5F7',
  textMuted: '#8E8E93',
  primary: '#FF375F',
  primarySubtle: 'rgba(255, 55, 95, 0.12)',
  primaryText: '#FF375F',
  onPrimary: '#FFFFFF',
  success: '#32D74B',
  successSubtle: 'rgba(50, 215, 75, 0.12)',
  onSuccess: '#000000',
  info: '#32ADE6',
  infoSubtle: 'rgba(50, 173, 230, 0.12)',
  onInfo: '#000000',
  water: '#32ADE6',
  warning: '#FFD60A',
  warningSubtle: 'rgba(255, 214, 10, 0.12)',
  onWarning: '#000000',
  danger: '#FF453A',
  dangerSubtle: 'rgba(255, 69, 58, 0.12)',
  onDanger: '#FFFFFF',
  weight: '#BF5AF2',
  weightSubtle: 'rgba(191, 90, 242, 0.12)',
  onSurface: '#F5F5F7',
};

export const lightColors: ColorTokens = {
  background: '#F5F5F7',
  surface: '#FFFFFF',
  surfaceElevated: '#F2F2F7',
  surfacePressed: '#E5E5EA',
  divider: '#D1D1D6',
  dividerSubtle: 'rgba(60, 60, 67, 0.08)',
  border: '#D1D1D6',
  overlay: 'rgba(0, 0, 0, 0.4)',
  textPrimary: '#000000',
  textSecondary: '#48484A',
  textTertiary: '#8E8E93',
  textDisabled: '#C7C7CC',
  text: '#000000',
  textMuted: '#8E8E93',
  primary: '#E83255',
  primarySubtle: 'rgba(255, 55, 95, 0.10)',
  primaryText: '#E83255',
  onPrimary: '#FFFFFF',
  success: '#28A745',
  successSubtle: 'rgba(50, 215, 75, 0.10)',
  onSuccess: '#000000',
  info: '#0A84FF',
  infoSubtle: 'rgba(10, 132, 255, 0.10)',
  onInfo: '#FFFFFF',
  water: '#0A84FF',
  warning: '#FF9F0A',
  warningSubtle: 'rgba(255, 159, 10, 0.10)',
  onWarning: '#000000',
  danger: '#FF3B30',
  dangerSubtle: 'rgba(255, 59, 48, 0.10)',
  onDanger: '#FFFFFF',
  weight: '#AF52DE',
  weightSubtle: 'rgba(175, 82, 222, 0.10)',
  onSurface: '#000000',
};
