/**
 * NomText — typography primitive that resolves text variant → font family/size/etc.
 * Also picks a sensible default color from the active theme.
 */

import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { TYPE, TextVariant } from './tokens';
import { useTheme } from './ThemeContext';

export interface NomTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  soft?: boolean; // use textSoft from theme
  faint?: boolean; // use textFaint from theme
  uppercase?: boolean;
  center?: boolean;
  style?: TextStyle | TextStyle[];
}

export function NomText({
  variant = 'bodyMd',
  color,
  soft,
  faint,
  uppercase,
  center,
  style,
  children,
  ...rest
}: NomTextProps) {
  const theme = useTheme();
  const spec = TYPE[variant];

  const resolvedColor =
    color ?? (faint ? theme.textFaint : soft ? theme.textSoft : theme.text);

  const base: TextStyle = {
    fontFamily: spec.family,
    fontSize: spec.size,
    lineHeight: spec.lineHeight,
    letterSpacing: spec.letterSpacing,
    color: resolvedColor,
    textAlign: center ? 'center' : undefined,
    textTransform: uppercase ? 'uppercase' : undefined,
  };

  return (
    <Text style={[base, style as TextStyle]} {...rest}>
      {children}
    </Text>
  );
}
