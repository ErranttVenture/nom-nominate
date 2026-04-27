/**
 * Splat — the signature organic blob. 4 seeds = 4 distinct silhouettes.
 * Used as background behind text (lockup, hot-pick stickers), as YUM/NOPE
 * stamp backdrop on swipe, and as loading indicator.
 *
 * Paths are static SVG — no shaders, no filters. Works identically on every
 * platform. Optional inner highlight adds a subtle 3D feel.
 */

import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { View, ViewStyle, StyleProp } from 'react-native';

// 4 hand-authored silhouettes — original shapes, not any branded mark.
const SPLAT_PATHS = [
  'M50,4 C70,2 88,14 92,32 C108,36 108,62 90,70 C100,88 76,100 62,90 C56,104 36,102 32,88 C16,92 2,76 10,60 C-4,50 8,22 28,22 C30,8 40,4 50,4 Z M18,88 C22,84 26,86 24,92 C22,96 16,94 18,88 Z M82,90 C86,86 92,88 90,94 C88,98 80,96 82,90 Z',
  'M48,6 C68,0 90,12 90,32 C108,40 106,66 88,74 C96,92 70,104 56,92 C50,106 28,102 28,86 C12,90 0,72 10,56 C0,44 14,20 30,22 C32,6 40,6 48,6 Z M12,84 C16,80 22,82 20,88 C18,92 10,90 12,84 Z',
  'M52,2 C74,6 90,22 86,42 C104,50 102,74 84,78 C92,98 62,104 52,88 C40,100 16,90 20,72 C4,64 4,38 22,32 C24,10 40,0 52,2 Z M80,92 C84,90 88,94 86,98 C82,100 78,96 80,92 Z',
  'M50,2 C72,4 94,18 90,38 C108,52 96,80 76,80 C82,100 52,102 44,86 C26,96 6,80 16,60 C4,46 18,22 34,22 C34,6 44,0 50,2 Z',
];

export interface SplatProps {
  size?: number;
  color?: string;
  /** 0-3 — chooses one of the 4 silhouettes. Values wrap. */
  seed?: number;
  /** Rotation in degrees — gives each instance personality. */
  rotation?: number;
  /** Subtle inner white highlight for a painterly feel. Default on. */
  highlight?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Splat({
  size = 200,
  color = '#FF6B1A',
  seed = 0,
  rotation = 0,
  highlight = true,
  style,
}: SplatProps) {
  const d = SPLAT_PATHS[((seed % SPLAT_PATHS.length) + SPLAT_PATHS.length) % SPLAT_PATHS.length];
  return (
    <View style={[{ width: size, height: size, transform: [{ rotate: `${rotation}deg` }] }, style]}>
      <Svg viewBox="0 0 100 100" width={size} height={size}>
        <Path d={d} fill={color} />
        {highlight && (
          <Path
            d={d}
            fill="rgba(255,255,255,0.15)"
            // Shrink + nudge the highlight toward the top-left
            transform="translate(7 7) scale(0.35)"
          />
        )}
      </Svg>
    </View>
  );
}
