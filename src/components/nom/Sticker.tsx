/**
 * Sticker — a rotated pill with ChunkyShadow + optional washi-tape top.
 * Used everywhere: match chips, hot-pick badges, lobby name tags, toasts.
 * Rotation gives each instance personality; defaults to -3°.
 */

import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { ChunkyShadow } from './ChunkyShadow';
import { NomText, NomTextProps } from '@/theme/NomText';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACE } from '@/theme/tokens';

export interface StickerProps {
  children: React.ReactNode;
  /** Background color — defaults to theme.warn (yellow). */
  color?: string;
  /** Text color — defaults to theme.text. */
  textColor?: string;
  /** Rotation in degrees. Default -3°. */
  rotation?: number;
  /** Show a small washi-tape strip at the top. */
  tape?: boolean;
  /** Text variant for children when rendered as string. */
  variant?: NomTextProps['variant'];
  /** Override padding. */
  paddingX?: number;
  paddingY?: number;
  style?: StyleProp<ViewStyle>;
}

export function Sticker({
  children,
  color,
  textColor,
  rotation = -3,
  tape,
  variant = 'headingMd',
  paddingX = SPACE[4],
  paddingY = SPACE[1] + 2,
  style,
}: StickerProps) {
  const theme = useTheme();
  const bg = color ?? theme.warn;
  const fg = textColor ?? theme.text;

  const content =
    typeof children === 'string' ? (
      <NomText variant={variant} color={fg}>
        {children}
      </NomText>
    ) : (
      children
    );

  return (
    <View style={[{ transform: [{ rotate: `${rotation}deg` }] }, style]}>
      <ChunkyShadow size="sm" radius={RADIUS.sm}>
        <View
          style={{
            backgroundColor: bg,
            borderWidth: 1.5,
            borderColor: theme.borderStrong,
            borderRadius: RADIUS.sm,
            paddingHorizontal: paddingX,
            paddingVertical: paddingY,
          }}
        >
          {content}
        </View>
        {tape && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -6,
              left: '50%',
              marginLeft: -14,
              width: 28,
              height: 10,
              backgroundColor: 'rgba(255,255,255,0.7)',
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderStyle: 'dashed',
              borderColor: theme.borderStrong,
              transform: [{ rotate: '-8deg' }],
            }}
          />
        )}
      </ChunkyShadow>
    </View>
  );
}
