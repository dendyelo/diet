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
  background: '#0B0D0E',
  surface: '#141719',
  surfaceElevated: '#1D2122',
  surfacePressed: '#272C2E',
  divider: '#272B2D',
  dividerSubtle: 'rgba(255, 255, 255, 0.045)',
  border: '#272B2D',
  overlay: 'rgba(0, 0, 0, 0.75)',
  textPrimary: '#F5F6F2',
  textSecondary: '#C5C8C1',
  textTertiary: '#8D918B',
  textDisabled: '#595D58',
  text: '#F5F6F2',
  textMuted: '#8D918B',
  primary: '#C9F47A',
  primarySubtle: 'rgba(201, 244, 122, 0.12)',
  primaryText: '#D9FF91',
  onPrimary: '#15200E',
  success: '#82D7A8',
  successSubtle: 'rgba(130, 215, 168, 0.12)',
  onSuccess: '#102018',
  info: '#77AEEB',
  infoSubtle: 'rgba(119, 174, 235, 0.12)',
  onInfo: '#FFFFFF',
  water: '#77AEEB',
  warning: '#E4B867',
  warningSubtle: 'rgba(228, 184, 103, 0.12)',
  onWarning: '#241A08',
  danger: '#E98282',
  dangerSubtle: 'rgba(233, 130, 130, 0.12)',
  onDanger: '#FFFFFF',
  weight: '#B7A4EA',
  weightSubtle: 'rgba(183, 164, 234, 0.12)',
  onSurface: '#F5F6F2',
};

export const lightColors: ColorTokens = {
  background: '#F5F5F2',
  surface: '#FFFFFF',
  surfaceElevated: '#EEEFEA',
  surfacePressed: '#E5E7E1',
  divider: '#E5E6E1',
  dividerSubtle: 'rgba(23, 24, 23, 0.045)',
  border: '#E5E6E1',
  overlay: 'rgba(0, 0, 0, 0.4)',
  textPrimary: '#171817',
  textSecondary: '#51544F',
  textTertiary: '#767972',
  textDisabled: '#A8AAA5',
  text: '#171817',
  textMuted: '#767972',
  primary: '#087A57',
  primarySubtle: 'rgba(8, 122, 87, 0.09)',
  primaryText: '#076447',
  onPrimary: '#FFFFFF',
  success: '#21865D',
  successSubtle: 'rgba(33, 134, 93, 0.10)',
  onSuccess: '#FFFFFF',
  info: '#4D8FD9',
  infoSubtle: 'rgba(77, 143, 217, 0.10)',
  onInfo: '#FFFFFF',
  water: '#4D8FD9',
  warning: '#A46E19',
  warningSubtle: 'rgba(164, 110, 25, 0.10)',
  onWarning: '#FFFFFF',
  danger: '#B54A4A',
  dangerSubtle: 'rgba(181, 74, 74, 0.09)',
  onDanger: '#FFFFFF',
  weight: '#7463AC',
  weightSubtle: 'rgba(116, 99, 172, 0.10)',
  onSurface: '#171817',
};
