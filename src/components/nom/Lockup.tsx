/**
 * Lockup — "nom" set on a splat. The primary app mark.
 * Used on splash, auth, home header, and as the launcher icon source art.
 * size=1 ≈ 200x140. Scales proportionally.
 */

import React from 'react';
import { View, ViewStyle, StyleProp, Text } from 'react-native';
import { Splat } from './Splat';
import { useTheme } from '@/theme/ThemeContext';
import { FONT } from '@/theme/tokens';

export interface LockupProps {
  /** Scale factor. 1 = 200×140. */
  size?: number;
  /** Splat color. Defaults to theme.action. */
  color?: string;
  /** Ink color for "nom". Defaults to theme.text. */
  ink?: string;
  /** Paper color for textshadow offset. Defaults to theme.bg. */
  paper?: string;
  style?: StyleProp<ViewStyle>;
}

export function Lockup({ size = 1, color, ink, paper, style }: LockupProps) {
  const theme = useTheme();
  const W = 200 * size;
  const H = 140 * size;
  const splatColor = color ?? theme.action;
  const inkColor = ink ?? theme.text;
  const paperColor = paper ?? theme.bg;
  const fontSize = 54 * size;
  const shadowOffset = Math.max(1, Math.round(2 * size));

  return (
    <View style={[{ width: W, height: H }, style]}>
      <Splat
        size={W}
        color={splatColor}
        seed={1}
        rotation={-6}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: '-2deg' }],
        }}
      >
        {/* Cheap fake text-shadow: a paper-colored copy offset behind */}
        <View style={{ position: 'relative' }}>
          <Text
            style={{
              position: 'absolute',
              top: shadowOffset,
              left: shadowOffset,
              fontFamily: FONT.marker,
              fontSize,
              lineHeight: fontSize * 1.02,
              color: paperColor,
              letterSpacing: -fontSize * 0.02,
            }}
          >
            nom
          </Text>
          <Text
            style={{
              fontFamily: FONT.marker,
              fontSize,
              lineHeight: fontSize * 1.02,
              color: inkColor,
              letterSpacing: -fontSize * 0.02,
            }}
          >
            nom
          </Text>
        </View>
      </View>
    </View>
  );
}
