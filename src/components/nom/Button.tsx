/**
 * NomButton — Primary / Secondary / Ghost / Destruct / Icon.
 * All variants use the ChunkyShadow primitive (except Ghost = dashed, no shadow).
 * Pressed state translates content (2,2) — ChunkyShadow handles the rest.
 *
 *  Heights: Primary/Secondary/Destruct ~52px. Ghost ~44px. Icon defaults to 52.
 *  Radii:   lg (14) on rectangles; full circle on Icon.
 */

import React, { useState } from 'react';
import {
  Pressable,
  View,
  ViewStyle,
  StyleProp,
  GestureResponderEvent,
  ActivityIndicator,
} from 'react-native';
import { ChunkyShadow } from './ChunkyShadow';
import { Icon, IconName } from './Icon';
import { NomText } from '@/theme/NomText';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACE, STROKE } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destruct';

export interface NomButtonProps {
  label?: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: Variant;
  /** Lead icon (optional). */
  leadIcon?: IconName;
  /** Trail icon (optional). */
  trailIcon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  /** Fill parent width (flex-stretched). */
  stretch?: boolean;
  /** Smaller pill (40px tall) for compact rows. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function NomButton({
  label,
  onPress,
  variant = 'primary',
  leadIcon,
  trailIcon,
  disabled,
  loading,
  stretch,
  compact,
  style,
  children,
}: NomButtonProps) {
  const theme = useTheme();
  const [pressed, setPressed] = useState(false);

  const bg: Record<Variant, string> = {
    primary: theme.action,
    secondary: theme.surface,
    ghost: 'transparent',
    destruct: theme.destruct,
  };
  const fg: Record<Variant, string> = {
    primary: theme.actionFg,
    secondary: theme.text,
    ghost: theme.text,
    destruct: theme.surface,
  };

  const height = compact ? 40 : 52;
  const radius = RADIUS.lg;
  const borderColor = theme.borderStrong;

  const inner = (
    <View
      style={{
        height,
        paddingHorizontal: SPACE[4],
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACE[2],
        backgroundColor: bg[variant],
        borderRadius: radius,
        borderWidth: variant === 'ghost' ? STROKE.std : STROKE.chunky,
        borderColor,
        borderStyle: variant === 'ghost' ? 'dashed' : 'solid',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg[variant]} />
      ) : (
        <>
          {leadIcon && <Icon name={leadIcon} size={18} color={fg[variant]} />}
          {label ? (
            <NomText
              variant={compact ? 'headingMd' : 'displayMd'}
              color={fg[variant]}
            >
              {label}
            </NomText>
          ) : (
            children
          )}
          {trailIcon && <Icon name={trailIcon} size={18} color={fg[variant]} />}
        </>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[stretch ? { alignSelf: 'stretch' } : undefined, style]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      accessibilityLabel={label}
    >
      {variant === 'ghost' ? (
        // No shadow on ghost — it's a tertiary action.
        inner
      ) : (
        <ChunkyShadow
          size={compact ? 'sm' : 'md'}
          radius={radius}
          pressed={pressed && !disabled}
          stretch={stretch}
        >
          {inner}
        </ChunkyShadow>
      )}
    </Pressable>
  );
}

// ─── Icon button (circular) ───

export interface IconButtonProps {
  name: IconName;
  onPress?: (e: GestureResponderEvent) => void;
  /** Size of the circular button. Default 52. Min hit-target is 44. */
  size?: number;
  variant?: 'secondary' | 'primary' | 'destruct';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  name,
  onPress,
  size = 52,
  variant = 'secondary',
  disabled,
  style,
}: IconButtonProps) {
  const theme = useTheme();
  const [pressed, setPressed] = useState(false);

  const bg =
    variant === 'primary'
      ? theme.action
      : variant === 'destruct'
        ? theme.destruct
        : theme.surface;
  const fg =
    variant === 'primary'
      ? theme.actionFg
      : variant === 'destruct'
        ? theme.surface
        : theme.text;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={style}
      hitSlop={size < 44 ? (44 - size) / 2 : 0}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={name}
    >
      <ChunkyShadow size="md" radius={size / 2} pressed={pressed && !disabled}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bg,
            borderWidth: STROKE.chunky,
            borderColor: theme.borderStrong,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled ? 0.4 : 1,
          }}
        >
          <Icon name={name} size={size * 0.44} color={fg} />
        </View>
      </ChunkyShadow>
    </Pressable>
  );
}
