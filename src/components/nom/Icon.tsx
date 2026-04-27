/**
 * Icon — the 16 Nom icons, stroked on a 24x24 grid.
 * The hand-feel of the app comes from splats + display type;
 * icons stay crisp to carry hierarchy.
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export const NOM_ICONS = {
  back: 'M15,4 L7,12 L15,20 M7,12 L20,12',
  close: 'M6,6 L18,18 M18,6 L6,18',
  heart:
    'M12,20 C6,16 2,12 2,8 A4,4 0 0 1 10,6 C11,7 12,9 12,9 C12,9 13,7 14,6 A4,4 0 0 1 22,8 C22,12 18,16 12,20 Z',
  share: 'M12,3 L12,15 M7,8 L12,3 L17,8 M5,13 L5,20 L19,20 L19,13',
  undo: 'M4,10 L4,4 L10,4 M4,10 C4,10 7,6 12,6 A8,8 0 1 1 4,14',
  users:
    'M9,11 A3,3 0 1 0 9,5 A3,3 0 1 0 9,11 M17,11 A2.5,2.5 0 1 0 17,6 A2.5,2.5 0 1 0 17,11 M3,20 C3,16 5,13 9,13 C13,13 15,16 15,20 M15,20 L21,20 C21,17 19,15 17,15',
  copy: 'M8,8 L8,20 L18,20 L18,8 Z M6,16 L4,16 L4,4 L14,4 L14,6',
  timer:
    'M12,8 L12,13 L15,15 M12,21 A9,9 0 1 1 12,3 A9,9 0 1 1 12,21 M9,2 L15,2',
  flame:
    'M12,3 C13,7 18,9 18,14 A6,6 0 1 1 6,14 C6,11 8,10 9,8 C9,10 10,11 11,11 C11,9 10,7 12,3 Z',
  pin: 'M12,21 C12,21 5,14 5,9 A7,7 0 1 1 19,9 C19,14 12,21 12,21 Z M12,11 A2,2 0 1 1 12,7 A2,2 0 1 1 12,11 Z',
  settings:
    'M12,15 A3,3 0 1 1 12,9 A3,3 0 1 1 12,15 M19,12 L21,12 M3,12 L5,12 M12,3 L12,5 M12,19 L12,21 M5.6,5.6 L7,7 M17,17 L18.4,18.4 M5.6,18.4 L7,17 M17,7 L18.4,5.6',
  plus: 'M12,5 L12,19 M5,12 L19,12',
  check: 'M4,12 L10,18 L20,6',
  bolt: 'M13,2 L4,14 L11,14 L10,22 L20,10 L13,10 L14,2 Z',
  star: 'M12,2 L14.6,8.6 L22,9.3 L16.5,14 L18,21 L12,17 L6,21 L7.5,14 L2,9.3 L9.4,8.6 Z',
  forkknife:
    'M6,3 L6,11 M8,3 L8,11 M10,3 L10,11 M8,11 L8,21 M16,3 C14,5 14,9 16,10 L16,21',
} as const;

export type IconName = keyof typeof NOM_ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** Solid icons (filled) vs the default stroke-only treatment. */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Icon({
  name,
  size = 24,
  color,
  strokeWidth = 2,
  filled,
  style,
}: IconProps) {
  const theme = useTheme();
  const stroke = color ?? theme.text;
  const d = NOM_ICONS[name];

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d={d}
          fill={filled ? stroke : 'none'}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
