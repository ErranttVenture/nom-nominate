/**
 * VenueCard — polaroid-style swipeable restaurant card.
 *
 * Visual anatomy (top → bottom):
 *   - Paper base with 2.5px ink border and ChunkyShadow (static View, not RN shadow)
 *   - Washi tape top
 *   - Photo area (VenuePhoto primitive with Places photoUrl)
 *   - Rating corner (paper card with ink border, star + number)
 *   - HOT PICK sticker (if venue.hasOffer)
 *   - Caption strip: big marker name, hand subtitle, chip tags
 *
 * Swipe interactions:
 *   - Drag commits to YUM at +30% screen width, NOPE at -30%.
 *   - Splats reveal behind the card on drag (orange right, blue left).
 *   - YUM!/NOPE stamps fade in on top of the card during drag.
 *   - Card exits with a timed translate; landing triggers the parent
 *     callback which advances the queue.
 */

import React, { useMemo } from 'react';
import { View, Dimensions, StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import type { Venue } from '@/types';
import { useTheme } from '@/theme/ThemeContext';
import { COLOR, RADIUS, SPACE, STROKE } from '@/theme/tokens';
import { NomText } from '@/theme/NomText';
import { Splat } from '@/components/nom/Splat';
import { Star } from '@/components/nom/Shapes';
import { Sticker } from '@/components/nom/Sticker';
import { VenuePhoto } from '@/components/nom/VenuePhoto';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 360);
const CARD_HEIGHT = 540;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface VenueCardProps {
  venue: Venue;
  onSwipeLeft: (venueId: string) => void;
  onSwipeRight: (venueId: string) => void;
  style?: StyleProp<ViewStyle>;
}

const FALLBACK_TAGS = ['tasty', 'cozy'];

export function VenueCard({
  venue,
  onSwipeLeft,
  onSwipeRight,
  style,
}: VenueCardProps) {
  const theme = useTheme();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.3;
    })
    .onEnd(() => {
      if (translateX.value > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 280 });
        runOnJS(onSwipeRight)(venue.id);
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 280 });
        runOnJS(onSwipeLeft)(venue.id);
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        rotate: `${interpolate(
          translateX.value,
          [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
          [-14, -1, 14]
        )}deg`,
      },
    ],
  }));

  const yumStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD * 0.4, SWIPE_THRESHOLD],
      [0, 0.4, 1],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        scale: interpolate(
          translateX.value,
          [0, SWIPE_THRESHOLD],
          [0.6, 1],
          Extrapolation.CLAMP
        ),
      },
      { rotate: '-14deg' },
    ],
  }));

  const nopeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.4, 0],
      [1, 0.4, 0],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        scale: interpolate(
          translateX.value,
          [-SWIPE_THRESHOLD, 0],
          [1, 0.6],
          Extrapolation.CLAMP
        ),
      },
      { rotate: '12deg' },
    ],
  }));

  const yumSplatBg = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [SWIPE_THRESHOLD * 0.3, SWIPE_THRESHOLD],
      [0, 0.85],
      Extrapolation.CLAMP
    ),
  }));

  const nopeSplatBg = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.3],
      [0.85, 0],
      Extrapolation.CLAMP
    ),
  }));

  const priceDisplay = '$'.repeat(Math.max(1, venue.priceLevel || 1));
  const tags = useMemo(() => {
    if (venue.hasOffer) return ['offer', venue.cuisine].filter(Boolean);
    const base = [venue.cuisine].filter(Boolean) as string[];
    return base.length ? base.concat(FALLBACK_TAGS.slice(0, 2)) : FALLBACK_TAGS;
  }, [venue.cuisine, venue.hasOffer]);

  return (
    <View
      style={[
        {
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {/* Background splat reveal — behind card */}
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: '25%', right: -60, zIndex: 0 },
          yumSplatBg,
        ]}
      >
        <Splat size={280} color={theme.splatYes} seed={2} rotation={-8} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: '25%', left: -60, zIndex: 0 },
          nopeSplatBg,
        ]}
      >
        <Splat size={280} color={theme.splatNo} seed={3} rotation={14} />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            {
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
            },
            cardStyle,
          ]}
        >
          {/* ChunkyShadow rectangle — offset behind card */}
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
          {/* Card body — polaroid */}
          <View
            style={{
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              backgroundColor: COLOR.neutral.paper,
              borderWidth: STROKE.chunky,
              borderColor: theme.borderStrong,
              borderRadius: RADIUS.xl,
              overflow: 'hidden',
            }}
          >
            {/* Photo area (74% of height) */}
            <View
              style={{
                height: CARD_HEIGHT * 0.66,
                width: '100%',
                position: 'relative',
              }}
            >
              <VenuePhoto
                name={venue.name}
                uri={venue.photoUrl}
                cuisine={venue.cuisine}
                style={{ width: '100%', height: '100%' }}
              />

              {/* Rating corner */}
              <View
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: COLOR.neutral.paper,
                  borderColor: theme.borderStrong,
                  borderWidth: 1.5,
                  borderRadius: 12,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Star
                  size={13}
                  color={COLOR.brand.warn}
                  stroke={theme.borderStrong}
                />
                <NomText variant="headingMd" color={COLOR.neutral.ink}>
                  {venue.rating.toFixed(1)}
                </NomText>
              </View>

              {/* HOT PICK sticker for offers */}
              {venue.hasOffer && (
                <View style={{ position: 'absolute', top: 18, left: -6 }}>
                  <Sticker
                    color={COLOR.brand.warn}
                    textColor={COLOR.neutral.ink}
                    rotation={-8}
                    variant="headingMd"
                    paddingX={10}
                    paddingY={3}
                  >
                    HOT PICK
                  </Sticker>
                </View>
              )}
            </View>

            {/* Caption strip — polaroid bottom */}
            <View
              style={{
                flex: 1,
                paddingHorizontal: SPACE[4],
                paddingTop: SPACE[3],
                paddingBottom: SPACE[3],
                borderTopWidth: 1.5,
                borderTopColor: theme.borderStrong,
                backgroundColor: COLOR.neutral.paper,
                justifyContent: 'space-between',
              }}
            >
              <View>
                <NomText
                  variant="displayMd"
                  color={COLOR.neutral.ink}
                  style={{ fontSize: 22, lineHeight: 24 }}
                >
                  {venue.name}
                </NomText>
                <NomText
                  variant="bodyMd"
                  color="rgba(20,18,22,0.6)"
                  style={{ marginTop: 2 }}
                >
                  {[venue.cuisine, priceDisplay, `${venue.distanceMiles}mi`]
                    .filter(Boolean)
                    .join(' · ')}
                </NomText>
              </View>
              <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                {tags.slice(0, 3).map((t) => (
                  <View
                    key={t}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderWidth: 1.2,
                      borderColor: COLOR.neutral.ink,
                      borderRadius: RADIUS.full,
                    }}
                  >
                    <NomText variant="bodySm" color={COLOR.neutral.ink}>
                      {t}
                    </NomText>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Washi tape top — sits above card border */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -8,
              left: '50%',
              marginLeft: -40,
              width: 80,
              height: 14,
              backgroundColor: theme.action,
              opacity: 0.88,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderStyle: 'dashed',
              borderColor: theme.borderStrong,
              transform: [{ rotate: '-6deg' }],
            }}
          />

          {/* YUM! stamp */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: CARD_HEIGHT * 0.18,
                right: 16,
                width: 130,
                height: 96,
                alignItems: 'center',
                justifyContent: 'center',
              },
              yumStyle,
            ]}
          >
            <Splat
              size={130}
              color={theme.splatYes}
              seed={0}
              highlight={false}
              style={{ position: 'absolute', top: 0, left: 0 }}
            />
            <NomText
              variant="displayLg"
              color={COLOR.neutral.paper}
              style={{ fontSize: 28 }}
            >
              YUM!
            </NomText>
          </Animated.View>

          {/* NOPE stamp */}
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: CARD_HEIGHT * 0.18,
                left: 16,
                width: 130,
                height: 96,
                alignItems: 'center',
                justifyContent: 'center',
              },
              nopeStyle,
            ]}
          >
            <Splat
              size={130}
              color={theme.splatNo}
              seed={2}
              highlight={false}
              style={{ position: 'absolute', top: 0, left: 0 }}
            />
            <NomText
              variant="displayLg"
              color={COLOR.neutral.paper}
              style={{ fontSize: 28 }}
            >
              NOPE
            </NomText>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
