/**
 * Solo Results — personal favorites list, same visual language as party results
 * but without vote bars (solo → 100% always).
 */

import React from 'react';
import { View, FlatList, Image, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePartyStore } from '@/stores/partyStore';
import type { Venue } from '@/types';
import { NomText } from '@/theme/NomText';
import { useTheme } from '@/theme/ThemeContext';
import { COLOR, RADIUS, SPACE, STROKE } from '@/theme/tokens';
import { IconButton, NomButton, Sticker, Icon } from '@/components/nom';

const RANK_COLORS = [COLOR.brand.orange, COLOR.brand.blue, COLOR.brand.warn];

export default function SoloResultsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const soloFavorites = usePartyStore((s) => s.soloFavorites);

  const renderResultItem = ({
    item,
    index,
  }: {
    item: Venue;
    index: number;
  }) => {
    const rank = index + 1;
    const accent = RANK_COLORS[index] ?? theme.surfaceAlt;
    const isTopThree = index < 3;
    const priceDisplay = '$'.repeat(item.priceLevel || 1);

    return (
      <View style={{ marginBottom: SPACE[3] }}>
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
              rotation={index % 2 === 0 ? -4 : 4}
              paddingX={10}
              paddingY={2}
              variant="displayMd"
            >
              {`#${rank}`}
            </Sticker>
          </View>

          {/* Thumbnail */}
          {item.photoUrl ? (
            <Image
              source={{ uri: item.photoUrl }}
              style={{
                width: 56,
                height: 56,
                borderRadius: RADIUS.md,
                borderWidth: STROKE.std,
                borderColor: theme.borderStrong,
              }}
            />
          ) : (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: RADIUS.md,
                borderWidth: STROKE.std,
                borderColor: theme.borderStrong,
                backgroundColor: theme.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="forkknife" size={24} color={theme.textSoft} />
            </View>
          )}

          {/* Info */}
          <View style={{ flex: 1 }}>
            <NomText
              variant="headingLg"
              color={theme.text}
              numberOfLines={1}
            >
              {item.name}
            </NomText>
            <NomText variant="bodySm" soft numberOfLines={1}>
              {item.cuisine}
            </NomText>
            <View
              style={{
                flexDirection: 'row',
                gap: SPACE[3],
                marginTop: SPACE[1],
              }}
            >
              <NomText variant="monoSm" color={theme.text}>
                ★ {item.rating}
              </NomText>
              <NomText variant="monoSm" color={theme.text}>
                {priceDisplay}
              </NomText>
              <NomText variant="monoSm" soft>
                {item.distanceMiles} mi
              </NomText>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={['top', 'bottom']}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: SPACE[3],
          paddingHorizontal: SPACE[5],
          paddingBottom: SPACE[2],
        }}
      >
        <IconButton name="back" size={44} onPress={() => router.back()} />
        <NomText variant="displayLg" style={{ flex: 1 }}>
          your picks
        </NomText>
        <Pressable onPress={() => router.replace('/')} hitSlop={10}>
          <Icon name="check" size={22} color={theme.textSoft} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: SPACE[5], marginBottom: SPACE[3] }}>
        <NomText variant="bodyLg" soft>
          the spots you swiped right on. tap any to open in maps.
        </NomText>
      </View>

      <FlatList
        data={soloFavorites}
        keyExtractor={(item) => item.id}
        renderItem={renderResultItem}
        contentContainerStyle={{
          paddingHorizontal: SPACE[5],
          paddingBottom: SPACE[4],
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View
            style={{
              alignItems: 'center',
              padding: SPACE[8],
              marginTop: SPACE[4],
            }}
          >
            <NomText variant="displayLg" center>
              nothing saved
            </NomText>
            <NomText
              variant="bodyMd"
              soft
              center
              style={{ marginTop: SPACE[2], maxWidth: 260 }}
            >
              swipe right on spots you like to add them here.
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
          paddingTop: SPACE[3],
          paddingBottom: SPACE[4],
          borderTopWidth: STROKE.std,
          borderTopColor: theme.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <NomButton
            label="GO AGAIN ↻"
            variant="secondary"
            stretch
            onPress={() => router.replace('/solo')}
          />
        </View>
        <View style={{ flex: 1 }}>
          <NomButton
            label="HOME"
            variant="primary"
            stretch
            onPress={() => router.replace('/')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
