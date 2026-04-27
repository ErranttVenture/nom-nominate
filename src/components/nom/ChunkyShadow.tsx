/**
 * ChunkyShadow — the signature "offset dark rectangle behind the thing" look.
 * This is NOT a real RN shadow (those blur). It's a second View layered behind
 * the content, offset by (x,y). Renders identically on iOS + Android.
 *
 * Layout model:
 *   - Wrapper reserves padding equal to the shadow offset (keeps layout stable
 *     across press states).
 *   - Shadow layer is absolutely positioned at the full offset.
 *   - Content sits on top; when `pressed`, content translates by (2,2) to
 *     "squish" toward the shadow (revealing only 1px of shadow ≈ the
 *     design spec's "1,1 pressed" state).
 */

import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import { SHADOW } from '@/theme/tokens';

export interface ChunkyShadowProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  radius?: number;
  /** Override shadow color — defaults to theme.borderStrong (ink / paper). */
  color?: string;
  /** Pressed state — content translates (2,2) so only 1px of shadow shows. */
  pressed?: boolean;
  /** Make the wrapper fill its parent (e.g. when used inside a flex row). */
  stretch?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ChunkyShadow({
  children,
  size = 'md',
  radius = 14,
  color,
  pressed,
  stretch,
  style,
}: ChunkyShadowProps) {
  const theme = useTheme();
  const offset = SHADOW[size];
  const shadowColor = color ?? theme.borderStrong;

  return (
    <View
      style={[
        {
          paddingRight: offset.x,
          paddingBottom: offset.y,
          alignSelf: stretch ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      <View style={{ position: 'relative' }}>
        {/* Shadow layer — sits at full offset, size matches content */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: offset.y,
            left: offset.x,
            right: -offset.x,
            bottom: -offset.y,
            backgroundColor: shadowColor,
            borderRadius: radius,
          }}
        />
        {/* Content layer */}
        <View
          style={{
            transform: pressed
              ? [{ translateX: 2 }, { translateY: 2 }]
              : undefined,
            borderRadius: radius,
          }}
        >
          {children}
        </View>
      </View>
    </View>
  );
}
