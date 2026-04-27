/**
 * Avatar — initials on a filled circle with chunky shadow.
 * Sizes per spec: 22 / 30 / 40 / 52. User-picked color from brand 5.
 * AvatarStack offsets members by -8px and collapses 6+ to a "+N" chip.
 */

import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { NomText } from '@/theme/NomText';
import { useTheme } from '@/theme/ThemeContext';
import { AVATAR_COLORS, SHADOW } from '@/theme/tokens';

export interface AvatarProps {
  name: string;
  /** Fill color — falls back to a deterministic pick from AVATAR_COLORS. */
  color?: string;
  size?: number;
  rotation?: number;
  style?: StyleProp<ViewStyle>;
}

function pickColor(name: string): string {
  const h = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function Avatar({
  name,
  color,
  size = 40,
  rotation = 0,
  style,
}: AvatarProps) {
  const theme = useTheme();
  const fill = color ?? pickColor(name);
  const offset = SHADOW.sm;

  return (
    <View
      style={[
        {
          width: size + offset.x,
          height: size + offset.y,
          transform: rotation ? [{ rotate: `${rotation}deg` }] : undefined,
        },
        style,
      ]}
    >
      {/* Shadow */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: offset.y,
          left: offset.x,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.borderStrong,
        }}
      />
      {/* Fill + initials */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: fill,
          borderWidth: 2,
          borderColor: theme.borderStrong,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <NomText
          variant="displayMd"
          color={theme.text}
          style={{ fontSize: size * 0.38, lineHeight: size * 0.38 }}
        >
          {initialsFor(name)}
        </NomText>
      </View>
    </View>
  );
}

// ─── Stack ───

export interface AvatarStackProps {
  members: Array<{ name: string; color?: string }>;
  /** Max visible before collapsing to "+N" chip. Default 5. */
  max?: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function AvatarStack({
  members,
  max = 5,
  size = 40,
  style,
}: AvatarStackProps) {
  const theme = useTheme();
  const visible = members.slice(0, max);
  const extra = members.length - visible.length;
  const offset = SHADOW.sm;

  // Light tilt per item for personality.
  const tilts = [-4, 3, -2, 4, -3, 2];

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      {visible.map((m, i) => (
        <View
          key={`${m.name}-${i}`}
          style={{ marginLeft: i === 0 ? 0 : -8, zIndex: visible.length - i }}
        >
          <Avatar
            name={m.name}
            color={m.color}
            size={size}
            rotation={tilts[i % tilts.length]}
          />
        </View>
      ))}
      {extra > 0 && (
        <View style={{ marginLeft: -8 }}>
          <View
            style={{
              width: size + offset.x,
              height: size + offset.y,
              transform: [{ rotate: '-2deg' }],
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: offset.y,
                left: offset.x,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: theme.borderStrong,
              }}
            />
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: theme.surface,
                borderWidth: 2,
                borderColor: theme.borderStrong,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <NomText
                variant="displayMd"
                color={theme.text}
                style={{ fontSize: size * 0.32, lineHeight: size * 0.32 }}
              >
                +{extra}
              </NomText>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
