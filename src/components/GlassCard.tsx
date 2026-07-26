import React from 'react';
import { ViewProps } from 'react-native';
import { Surface } from './Surface';

export interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = (props) => {
  return <Surface {...props} />;
};
