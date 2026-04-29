/**
 * Results — ranked venue voting chart.
 *
 * Visual: each row is a small polaroid-feel card with a rank badge
 * (sticker), a vote bar, and a percent readout. Top-3 ranks get
 * accent color (orange / blue / yellow).
 *
 * Business logic comes from `useResults`, unchanged.
 */

import React from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResults } from '@/hooks/useResults';
import { useTheme } from '@/theme/ThemeContext';
import { NomText } from '@/theme/NomText';
import { COLOR, RADIUS, SPACE, STROKE } from '@/theme/tokens';
import { NomButton, Sticker } from '@/components/nom';
import type { VenueVotes } from '@/types';

const RANK_COLORS = [COLOR.brand.orange, COLOR.brand.blue, COLOR.brand.warn];

export default function ResultsScreen() {
  const { partyId } = useLocalSearchParams<{ partyId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { results, party, loading } = useResults(partyId!);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.bg,
        }}
      >
        <ActivityIndicator color={theme.action} />
      </View>
    );
  }

  const renderItem = ({
    item,
    index,
  }: {
    item: VenueVotes;
    index: number;
  }) => {
    const rank = index + 1;
    const accent = RANK_COLORS[index] ?? theme.surfaceAlt;
    const isTopThree = index < 3;

    return (
      <View
        style={{
          marginBottom: SPACE[3],
        }}
      >
        {/* Chunky shadow backer */}
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
            flexDirection: 'row',
            alignItems: 'center',
            gap: SPACE[3],
            padding: SPACE[3],
            backgroundColor: theme.surface,
            borderWidth: STROKE.std,
            borderColor: theme.borderStrong,
            borderRadius: RADIUS.lg,
          }}
        >
          {/* Rank badge */}
          <View style={{ width: 42 }}>
            <Sticker
              color={isTopThree ? accent : theme.surfaceAlt}
              textColor={COLOR.neutral.ink}
              rotation={(index % 2 === 0 ? -4 : 4)}
              paddingX={10}
              paddingY={2}
              variant="displayMd"
            >
              {`#${rank}`}
            </Sticker>
          </View>

          {/* Info */}
          <View style={{ flex: 1 }}>
            <NomText variant="headingLg" color={theme.text} numberOfLines={1}>
              {item.venueName}
            </NomText>
            <NomText variant="bodySm" soft>
              {item.cuisine}
            </NomText>
            <View
              style={{
                marginTop: SPACE[1] + 2,
                height: 8,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 4,
                backgroundColor: theme.bg,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${item.percentage}%`,
                  height: '100%',
                  backgroundColor: accent,
                }}
              />
            </View>
          </View>

          {/* Percent */}
          <View style={{ alignItems: 'flex-end' }}>
            <NomText variant="displayMd" color={theme.text}>
              {item.percentage}%
            </NomText>
            <NomText variant="monoSm" faint uppercase>
              {item.rightSwipes}/{item.totalMembers}
            </NomText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      {/* Top nav */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: SPACE[5],
          paddingVertical: SPACE[2],
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <NomText variant="bodyLg" soft>
            ← back
          </NomText>
        </Pressable>
        <NomText variant="monoSm" soft uppercase>
          RESULTS
        </NomText>
        <View style={{ width: 40 }} />
      </View>

      {/* Header */}
      <View style={{ paddingHorizontal: SPACE[5], marginBottom: SPACE[3] }}>
        <NomText variant="displayXL" color={theme.text}>
          the group picked
        </NomText>
        <NomText variant="bodyMd" soft>
          {party?.name ?? 'party'} ·{' '}
          {party?.memberIds?.length ?? 0} members voted
        </NomText>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.venueId}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingHorizontal: SPACE[5],
          paddingBottom: SPACE[4],
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: SPACE[8] }}>
            <NomText variant="displayLg" center>
              no votes yet
            </NomText>
            <NomText
              variant="bodyMd"
              soft
              center
              style={{ marginTop: SPACE[2], maxWidth: 260 }}
            >
              results appear once members start swiping.
            </NomText>
          </View>
        }
      />

      {/* Bottom actions */}
      <View
        style={{
          flexDirection: 'row',
          gap: SPACE[2],
          paddingHorizontal: SPACE[5],
          paddingTop: SPACE[2],
          paddingBottom: SPACE[4],
        }}
      >
        <View style={{ flex: 1 }}>
          <NomButton
            label="LOBBY"
            variant="secondary"
            stretch
            onPress={() => router.replace(`/party/${partyId}`)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <NomButton
            label="HOME"
            variant="primary"
            stretch
            onPress={() => router.replace('/(tabs)')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
