/**
 * Nomination reveal — the design "Results Variant C" 3-reel slot machine.
 *
 * Layout (top → bottom):
 *   - Top nav (← lobby, RESULT label)
 *   - Header: "THE GROUP PICKED" (monospace eyebrow) with halftone wash
 *   - Slot machine: 3 reels on an accent panel. Each reel has a label
 *     (CUISINE / VIBE / PRICE) and a big Permanent-Marker glyph that
 *     "spins in" on mount.
 *   - Venue photo with a rotated tape label showing the winner name.
 *   - Meta row: rating · price · distance · match chip.
 *   - Voter avatar chips.
 *   - Action row: GO EAT, share, replay.
 */

import React, { useEffect, useMemo } from 'react';
import {
  View,
  Pressable,
  Share,
  Linking,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useNominatedVenue } from '@/hooks/useNominatedVenue';
import { useTheme } from '@/theme/ThemeContext';
import { NomText } from '@/theme/NomText';
import { COLOR, RADIUS, SPACE, STROKE } from '@/theme/tokens';
import {
  Halftone,
  Star,
  Sticker,
  VenuePhoto,
  NomButton,
  IconButton,
  AvatarStack,
} from '@/components/nom';
import { PartyService } from '@/lib/services';
import type { PartyMember } from '@/types';

// ─── Reel value mapping ───
// Lightweight: map cuisine to one emoji; vibe from price+rating; price text.

const CUISINE_EMOJI: Record<string, string> = {
  pizza: '🍕',
  italian: '🍕',
  mexican: '🌮',
  taco: '🌮',
  japanese: '🍣',
  sushi: '🍣',
  chinese: '🥟',
  thai: '🍜',
  indian: '🍛',
  korean: '🍚',
  vietnamese: '🍜',
  burger: '🍔',
  american: '🍔',
  bbq: '🍖',
  seafood: '🦞',
  salads: '🥗',
  mediterranean: '🥙',
  breakfast: '🥞',
  cafe: '☕',
  bakery: '🥐',
  dessert: '🍰',
  ice_cream: '🍦',
  bar: '🍸',
};

function cuisineEmoji(cuisine?: string): string {
  if (!cuisine) return '🍴';
  const key = cuisine.toLowerCase().trim();
  if (CUISINE_EMOJI[key]) return CUISINE_EMOJI[key];
  // partial match
  for (const k of Object.keys(CUISINE_EMOJI)) {
    if (key.includes(k)) return CUISINE_EMOJI[k];
  }
  return '🍴';
}

function vibeEmoji(rating?: number, priceLevel?: number): string {
  if ((rating ?? 0) >= 4.7) return '🔥';
  if ((priceLevel ?? 1) >= 3) return '✨';
  if ((rating ?? 0) >= 4.3) return '💖';
  return '⭐';
}

export default function SuccessScreen() {
  const { partyId, venueId } = useLocalSearchParams<{
    partyId: string;
    venueId: string;
  }>();
  const router = useRouter();
  const theme = useTheme();
  const { venue, party } = useNominatedVenue(partyId!, venueId!);

  const [members, setMembers] = React.useState<PartyMember[]>([]);
  useEffect(() => {
    if (!partyId) return;
    PartyService.getPartyMembers(partyId).then(setMembers).catch(() => {});
  }, [partyId]);

  // ─── Reel spin animations ───
  const reel1 = useSharedValue(-40);
  const reel2 = useSharedValue(-40);
  const reel3 = useSharedValue(-40);
  const opacity1 = useSharedValue(0);
  const opacity2 = useSharedValue(0);
  const opacity3 = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    reel1.value = withDelay(
      100,
      withSpring(0, { damping: 10, stiffness: 140 })
    );
    opacity1.value = withDelay(100, withTiming(1, { duration: 260 }));
    reel2.value = withDelay(
      320,
      withSpring(0, { damping: 10, stiffness: 140 })
    );
    opacity2.value = withDelay(320, withTiming(1, { duration: 260 }));
    reel3.value = withDelay(
      560,
      withSpring(0, { damping: 10, stiffness: 140 })
    );
    opacity3.value = withDelay(560, withTiming(1, { duration: 260 }));
  }, []);

  const reel1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: reel1.value }],
    opacity: opacity1.value,
  }));
  const reel2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: reel2.value }],
    opacity: opacity2.value,
  }));
  const reel3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: reel3.value }],
    opacity: opacity3.value,
  }));

  const reels = useMemo(
    () => [
      { label: 'CUISINE', val: cuisineEmoji(venue?.cuisine), style: reel1Style },
      {
        label: 'VIBE',
        val: vibeEmoji(venue?.rating, venue?.priceLevel),
        style: reel2Style,
      },
      {
        label: 'PRICE',
        val: '$'.repeat(Math.max(1, venue?.priceLevel ?? 1)),
        style: reel3Style,
      },
    ],
    [venue?.cuisine, venue?.priceLevel, venue?.rating]
  );

  const handleGoEat = () => {
    if (!venue) return;
    const q = encodeURIComponent(`${venue.name} ${venue.address ?? ''}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };
  const handleShare = () => {
    if (!venue) return;
    Share.share({
      message: `We're eating at ${venue.name}! 🎉`,
    });
  };
  const handleReplay = () => {
    router.replace({ pathname: '/party/results', params: { partyId } });
  };

  const totalVoters = members.length || party?.memberIds?.length || 0;
  const matchCount = party?.nominatedVenueVotes ?? 0;

  const priceDisplay = venue ? '$'.repeat(Math.max(1, venue.priceLevel || 1)) : '';

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
        <Pressable onPress={() => router.replace('/(tabs)')} hitSlop={10}>
          <NomText variant="bodyLg" soft>
            ← done
          </NomText>
        </Pressable>
        <NomText variant="monoSm" soft uppercase>
          RESULT
        </NomText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: SPACE[5] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header eyebrow with halftone */}
        <View
          style={{
            paddingHorizontal: SPACE[5],
            paddingTop: SPACE[1],
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 40,
              alignItems: 'center',
            }}
          >
            <Halftone
              width={280}
              height={40}
              color={theme.text}
              opacity={0.08}
              size={5}
            />
          </View>
          <NomText variant="monoSm" soft uppercase>
            THE GROUP PICKED
          </NomText>
        </View>

        {/* Slot machine */}
        <View
          style={{
            paddingHorizontal: SPACE[5],
            marginTop: SPACE[3],
          }}
        >
          <View style={{ position: 'relative' }}>
            {/* Shadow */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 4,
                left: 4,
                right: -4,
                bottom: -4,
                backgroundColor: theme.borderStrong,
                borderRadius: RADIUS.xl,
              }}
            />
            {/* Orange panel */}
            <View
              style={{
                backgroundColor: theme.action,
                borderWidth: STROKE.chunky,
                borderColor: theme.borderStrong,
                borderRadius: RADIUS.xl,
                padding: SPACE[2],
                flexDirection: 'row',
                gap: SPACE[1] + 2,
              }}
            >
              {reels.map((r, i) => (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    height: 104,
                    backgroundColor: theme.surface,
                    borderWidth: 2,
                    borderColor: theme.borderStrong,
                    borderRadius: RADIUS.md,
                    overflow: 'hidden',
                    justifyContent: 'space-between',
                    paddingVertical: 6,
                  }}
                >
                  <NomText
                    variant="monoSm"
                    soft
                    uppercase
                    center
                    style={{ letterSpacing: 1.5 }}
                  >
                    {r.label}
                  </NomText>
                  <Animated.View
                    style={[
                      { alignItems: 'center', justifyContent: 'center' },
                      r.style,
                    ]}
                  >
                    <NomText
                      variant="displayXL"
                      center
                      style={{ fontSize: 36, lineHeight: 38 }}
                    >
                      {r.val}
                    </NomText>
                  </Animated.View>
                  {/* scan line through middle */}
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: 6,
                      right: 6,
                      top: '54%',
                      height: 2,
                      backgroundColor: theme.action,
                      opacity: 0.4,
                    }}
                  />
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingHorizontal: 6,
                    }}
                  >
                    <NomText variant="monoSm" faint>
                      •••
                    </NomText>
                    <NomText variant="monoSm" faint>
                      •••
                    </NomText>
                  </View>
                </View>
              ))}
            </View>
            {/* Star accents */}
            <View
              style={{
                position: 'absolute',
                top: -12,
                left: -10,
                transform: [{ rotate: '-18deg' }],
              }}
            >
              <Star size={26} color={COLOR.brand.warn} />
            </View>
            <View
              style={{
                position: 'absolute',
                bottom: -8,
                right: -6,
                transform: [{ rotate: '10deg' }],
              }}
            >
              <Star size={18} color={COLOR.brand.warn} />
            </View>
          </View>
        </View>

        {/* Venue photo + tape label */}
        {venue && (
          <View style={{ paddingHorizontal: SPACE[5], marginTop: SPACE[5] }}>
            <View style={{ position: 'relative' }}>
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
                  height: 150,
                  borderRadius: RADIUS.lg,
                  overflow: 'hidden',
                  borderWidth: STROKE.chunky,
                  borderColor: theme.borderStrong,
                }}
              >
                <VenuePhoto
                  name={venue.name}
                  uri={venue.photoUrl}
                  cuisine={venue.cuisine}
                  style={{ width: '100%', height: '100%' }}
                />
                <View
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 0,
                    right: 0,
                    alignItems: 'center',
                  }}
                >
                  <Sticker
                    color={COLOR.neutral.paper}
                    textColor={COLOR.neutral.ink}
                    rotation={-2}
                    tape
                    paddingX={16}
                    paddingY={4}
                    variant="displayMd"
                  >
                    {venue.name.toUpperCase()}
                  </Sticker>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Meta row */}
        {venue && (
          <View
            style={{
              paddingHorizontal: SPACE[5],
              marginTop: SPACE[4],
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <NomText variant="bodyLg">
              ★ {venue.rating.toFixed(1)} · {priceDisplay} ·{' '}
              {venue.distanceMiles}mi
            </NomText>
            {totalVoters > 0 && (
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderWidth: 1.5,
                  borderColor: theme.borderStrong,
                  borderRadius: RADIUS.full,
                  backgroundColor: theme.match,
                }}
              >
                <NomText
                  variant="monoSm"
                  color={COLOR.neutral.ink}
                  uppercase
                  style={{ letterSpacing: 1 }}
                >
                  {matchCount}/{totalVoters} MATCH
                </NomText>
              </View>
            )}
          </View>
        )}

        {/* Voter chips */}
        {members.length > 0 && (
          <View
            style={{
              paddingHorizontal: SPACE[5],
              marginTop: SPACE[3],
              flexDirection: 'row',
              alignItems: 'center',
              gap: SPACE[2],
            }}
          >
            <AvatarStack
              members={members.map((m) => ({ name: m.displayName }))}
              size={30}
              max={5}
            />
            <NomText variant="bodyMd" soft>
              swiped YUM
            </NomText>
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      <View
        style={{
          flexDirection: 'row',
          gap: SPACE[2],
          paddingHorizontal: SPACE[5],
          paddingTop: SPACE[2],
          paddingBottom: SPACE[4],
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1 }}>
          <NomButton
            label="GO EAT →"
            variant="primary"
            stretch
            onPress={handleGoEat}
          />
        </View>
        <IconButton name="share" size={52} onPress={handleShare} />
        <IconButton name="undo" size={52} onPress={handleReplay} />
      </View>
    </SafeAreaView>
  );
}
