/**
 * Shapes — small decorative SVG bits: Star, Bolt, Zigzag.
 * Used as accent sparkles around hero content, under headings, and
 * as layout dividers. All filled+stroked for that sticker vibe.
 */

import React from 'react';
import Svg, { Path, Polyline } from 'react-native-svg';
import { View, ViewStyle, StyleProp } from 'react-native';

export interface StarProps {
  size?: number;
  color?: string;
  stroke?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

export function Star({
  size = 24,
  color = '#FFC43D',
  stroke = '#141216',
  strokeWidth = 1.4,
  style,
}: StarProps) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg viewBox="0 0 24 24" width={size} height={size}>
        <Path
          d="M12,1.5 L14.8,8.7 L22.5,9.3 L16.4,14.2 L18.5,21.8 L12,17.3 L5.5,21.8 L7.6,14.2 L1.5,9.3 L9.2,8.7 Z"
          fill={color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

export interface BoltProps {
  size?: number;
  color?: string;
  stroke?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

export function Bolt({
  size = 28,
  color = '#FFC43D',
  stroke = '#141216',
  strokeWidth = 1.3,
  style,
}: BoltProps) {
  const w = size * 0.7;
  return (
    <View style={[{ width: w, height: size }, style]}>
      <Svg viewBox="0 0 20 28" width={w} height={size}>
        <Path
          d="M11,1 L3,16 L9,16 L6,27 L17,11 L11,11 L13,1 Z"
          fill={color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

export interface ZigzagProps {
  width?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

export function Zigzag({
  width = 80,
  color = '#141216',
  strokeWidth = 2.5,
  style,
}: ZigzagProps) {
  const height = width / 5;
  return (
    <View style={[{ width, height }, style]}>
      <Svg viewBox="0 0 60 12" width={width} height={height}>
        <Polyline
          points="2,6 10,2 18,10 26,2 34,10 42,2 50,10 58,6"
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
