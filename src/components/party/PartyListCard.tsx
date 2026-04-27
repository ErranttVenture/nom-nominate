/**
 * PartyListCard — row in the Home list.
 *
 * Visual: paper surface with ChunkyShadow, Sticker-style status chip,
 * marker-set party name and hand subtitle.
 */

import React from 'react';
import { Pressable, View, StyleProp, ViewStyle } from 'react-native';
import { NomText } from '@/theme/NomText';
import { useTheme } from '@/theme/ThemeContext';
import { COLOR, RADIUS, SPACE, STROKE } from '@/theme/tokens';
import { Sticker } from '@/components/nom';
import type { Party } from '@/types';

interface PartyListCardProps {
  party: Party;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function PartyListCard({ party, onPress, style }: PartyListCardProps) {
  const theme = useTheme();
  const memberCount = party.memberIds.length;
  const statusLabel = getStatusLabel(party);
  const statusColor = getStatusColor(party, theme);

  const dateStr = party.date
    ? new Date(party.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : undefined;

  return (
    <Pressable
      onPress={onPress}
      style={[{ marginBottom: SPACE[3] }, style]}
      accessibilityRole="button"
      accessibilityLabel={`${party.name} — ${statusLabel}`}
    >
      {/* Shadow */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 3,
          left: 3,
          right: -3,
          bottom: -3,
          backgroundColor: theme.borderStrong,
          borderRadius: RADIUS.lg,
        }}
      />
      <View
        style={{
          padding: SPACE[4],
          backgroundColor: theme.surface,
          borderWidth: STROKE.std,
          borderColor: theme.borderStrong,
          borderRadius: RADIUS.lg,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: SPACE[2],
          }}
        >
          <View style={{ flex: 1 }}>
            <NomText variant="displayMd" color={theme.text} numberOfLines={1}>
              {party.name}
            </NomText>
            <NomText
              variant="bodyMd"
              soft
              style={{ marginTop: 2 }}
              numberOfLines={1}
            >
              {memberCount} member{memberCount !== 1 ? 's' : ''} ·{' '}
              {party.zipCode} · {party.radiusMiles}mi
              {dateStr ? ` · ${dateStr}` : ''}
            </NomText>
          </View>
          {party.joinCode && (
            <View style={{ alignItems: 'flex-end' }}>
              <NomText variant="monoSm" faint uppercase>
                CODE
              </NomText>
              <NomText variant="headingLg" color={theme.action}>
                {party.joinCode}
              </NomText>
            </View>
          )}
        </View>
        <View style={{ marginTop: SPACE[2], alignSelf: 'flex-start' }}>
          <Sticker
            color={statusColor}
            textColor={COLOR.neutral.ink}
            rotation={-2}
            paddingX={10}
            paddingY={2}
            variant="headingMd"
          >
            {statusLabel}
          </Sticker>
        </View>
      </View>
    </Pressable>
  );
}

function getStatusLabel(party: Party): string {
  switch (party.status) {
    case 'lobby':
      return 'waiting';
    case 'swiping':
      return 'swiping';
    case 'nominated':
      return '✓ NOMINATED';
    case 'results':
      return 'results in';
    default:
      return party.status;
  }
}

function getStatusColor(party: Party, theme: ReturnType<typeof useTheme>) {
  switch (party.status) {
    case 'nominated':
      return theme.match;
    case 'swiping':
      return theme.action;
    case 'results':
      return theme.warn;
    default:
      return theme.surfaceAlt;
  }
}
