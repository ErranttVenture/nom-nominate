/**
 * Halftone — grid of small dots used for ambient texture behind hero art
 * and across venue photos. Designed to be cheap: dots are rendered as a
 * single SVG with fixed radius. Tune `size` (cell pitch) and `opacity`
 * to dial down noise.
 */

import React, { useMemo } from 'react';
import Svg, { Circle } from 'react-native-svg';
import { View, ViewStyle, StyleProp } from 'react-native';

export interface HalftoneProps {
  width: number;
  height: number;
  color?: string;
  opacity?: number;
  /** Cell size — dots are ~22% of this. Default 6px grid. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function Halftone({
  width,
  height,
  color = '#141216',
  opacity = 0.1,
  size = 6,
  style,
}: HalftoneProps) {
  const dots = useMemo(() => {
    const out: React.ReactElement[] = [];
    const r = size * 0.22;
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        out.push(
          <Circle
            key={`${x}-${y}`}
            cx={x + size / 2}
            cy={y + size / 2}
            r={r}
            fill={color}
          />
        );
      }
    }
    return out;
  }, [width, height, color, size]);

  return (
    <View style={[{ width, height, opacity }, style]}>
      <Svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
        {dots}
      </Svg>
    </View>
  );
}
