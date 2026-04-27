/**
 * Swipe screen — the Tinder-style venue picker.
 *
 * Visual language: card is polaroid-style (see VenueCard). Progress bar +
 * party dots live along the top. Bottom circle buttons commit a swipe
 * without gesture.
 *
 * Business logic is unchanged from the previous implementation:
 *   - Haptics on both directions.
 *   - advanceQueue + incrementSwipeCount fire before network so UX stays
 *     snappy.
 *   - After SWIPE_THRESHOLD (20) swipes, checkFallbackNomination.
 *   - If party.status flips to 'nominated' / 'results', redirect.
 *   - "No venues" + "expand radius" flows are preserved.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Dimensions,
  Animated as RNAnimated,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { PARTY } from '@/constants';
import { usePartyStore } from '@/stores/partyStore';
import { useSwipeSession } from '@/hooks/useSwipeSession';
import { CardStack } from '@/components/cards/CardStack';
import { SwipeService, PartyService } from '@/lib/services';
import { useTheme } from '@/theme/ThemeContext';
import { NomText } from '@/theme/NomText';
import { RADIUS, SPACE, STROKE } from '@/theme/tokens';
import { NomButton, IconButton, Avatar } from '@/components/nom';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = PARTY.MIN_SWIPES_FOR_FALLBACK;

export default function SwipeScreen() {
  const { partyId } = useLocalSearchParams<{ partyId: string }>();
  const router = useRouter();
  const theme = useTheme();
  const party = usePartyStore((s) => s.currentParty);
  const swipeCount = usePartyStore((s) => s.swipeCount);
  const incrementSwipeCount = usePartyStore((s) => s.incrementSwipeCount);

  const {
    loading,
    partyStatus,
    nominatedVenueId,
    venuesExhausted,
    venuesFetched,
    currentVenue,
    nextVenue,
    advanceQueue,
  } = useSwipeSession(partyId!);

  const [swiping, setSwiping] = useState(false);
  const [expandingRadius, setExpandingRadius] = useState(false);

  const progressAnim = useState(() => new RNAnimated.Value(0))[0];
  useEffect(() => {
    const progress = Math.min(swipeCount / SWIPE_THRESHOLD, 1);
    RNAnimated.spring(progressAnim, {
      toValue: progress,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [swipeCount]);

  // React to status changes
  useEffect(() => {
    if (partyStatus === 'nominated' && nominatedVenueId) {
      router.replace({
        pathname: '/party/success',
        params: { partyId, venueId: nominatedVenueId },
      });
    } else if (partyStatus === 'results') {
      router.replace({ pathname: '/party/results', params: { partyId } });
    }
  }, [partyStatus, nominatedVenueId]);

  const handleSwipe = useCallback(
    async (direction: 'left' | 'right') => {
      if (!currentVenue || swiping) return;
      const venue = currentVenue;
      setSwiping(true);

      if (direction === 'right') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      advanceQueue();
      incrementSwipeCount();

      try {
        const result = await SwipeService.recordSwipe({
          partyId: partyId!,
          venueId: venue.id,
          direction,
        });
        if (!result.nominated && swipeCount + 1 >= SWIPE_THRESHOLD) {
          await SwipeService.checkFallbackNomination(partyId!);
        }
      } catch (error) {
        console.error('[Swipe] Error recording swipe:', error);
      } finally {
        setSwiping(false);
      }
    },
    [partyId, currentVenue, advanceQueue, incrementSwipeCount, swiping, swipeCount]
  );

  const handleSwipeLeft = useCallback(() => handleSwipe('left'), [handleSwipe]);
  const handleSwipeRight = useCallback(
    () => handleSwipe('right'),
    [handleSwipe]
  );

  const handlePreviewResults = useCallback(() => {
    router.push({ pathname: '/party/results', params: { partyId } });
  }, [partyId, router]);

  const handleExpandRadius = useCallback(
    async (newRadius: 5 | 10 | 15 | 25) => {
      setExpandingRadius(true);
      try {
        await PartyService.expandRadius(partyId!, newRadius);
      } catch (error) {
        console.error('[Swipe] Error expanding radius:', error);
      } finally {
        setExpandingRadius(false);
      }
    },
    [partyId]
  );

  const hasMoreCards = !!currentVenue;
  const reachedThreshold = swipeCount >= SWIPE_THRESHOLD;
  const neverHadVenues =
    !loading && !currentVenue && (venuesFetched ?? 0) === 0;
  const ranOutOfVenues = !loading && !hasMoreCards && !neverHadVenues;

  const currentRadius = party?.radiusMiles ?? PARTY.DEFAULT_RADIUS_MILES;
  const largerRadiusOptions = PARTY.RADIUS_OPTIONS.filter(
    (r) => r > currentRadius
  );

  // ── Loading ──
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
        <NomText variant="bodyMd" soft style={{ marginTop: 12 }}>
          finding spots near you…
        </NomText>
      </View>
    );
  }

  // ── Empty (no venues at all) ──
  if (neverHadVenues) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={{ flex: 1, backgroundColor: theme.bg }}
      >
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: SPACE[5],
          }}
        >
          <NomText variant="displayLg" center>
            no spots found
          </NomText>
          <NomText
            variant="bodyMd"
            soft
            center
            style={{ marginTop: SPACE[2], maxWidth: 260 }}
          >
            We couldn't find any restaurants nearby. Try a different zip.
          </NomText>
          <View style={{ marginTop: SPACE[5] }}>
            <NomButton
              label="GO HOME"
              variant="primary"
              onPress={() => router.replace('/')}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      {/* Top bar: back, progress, member dots */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACE[5],
          gap: SPACE[3],
          paddingVertical: SPACE[2],
        }}
      >
        <IconButton
          name="back"
          size={36}
          onPress={() => router.replace(`/party/${partyId}`)}
        />
        <View style={{ flex: 1 }}>
          <NomText variant="monoSm" soft uppercase>
            ROUND 1 · {Math.min(swipeCount, SWIPE_THRESHOLD)}/{SWIPE_THRESHOLD}
          </NomText>
          {reachedThreshold ? (
            <Pressable onPress={handlePreviewResults} style={{ marginTop: 2 }}>
              <NomText variant="bodyMd" color={theme.action}>
                great job! preview results →
              </NomText>
            </Pressable>
          ) : (
            <View
              style={{
                marginTop: 4,
                height: 8,
                backgroundColor: theme.surface,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: theme.border,
                overflow: 'hidden',
              }}
            >
              <RNAnimated.View
                style={{
                  height: '100%',
                  backgroundColor: theme.action,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                }}
              />
            </View>
          )}
        </View>
        <View style={{ width: 12 }} />
      </View>

      {/* Card area */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: SPACE[4],
          overflow: 'hidden',
        }}
      >
        {hasMoreCards ? (
          <CardStack
            currentVenue={currentVenue}
            nextVenue={nextVenue ?? undefined}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
          />
        ) : ranOutOfVenues ? (
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: SPACE[5],
            }}
          >
            {venuesExhausted ? (
              <>
                <NomText variant="displayLg" center>
                  all caught up
                </NomText>
                <NomText
                  variant="bodyMd"
                  soft
                  center
                  style={{
                    marginTop: SPACE[2],
                    maxWidth: 280,
                    marginBottom: SPACE[5],
                  }}
                >
                  You've seen all {venuesFetched} spots within {currentRadius}mi.
                </NomText>
                {largerRadiusOptions.length > 0 ? (
                  <>
                    <NomText variant="monoSm" soft uppercase center>
                      EXPAND THE SEARCH
                    </NomText>
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: SPACE[2],
                        marginTop: SPACE[3],
                        marginBottom: SPACE[5],
                      }}
                    >
                      {largerRadiusOptions.map((r) => (
                        <NomButton
                          key={r}
                          label={`${r}mi`}
                          variant="secondary"
                          compact
                          loading={expandingRadius}
                          onPress={() =>
                            handleExpandRadius(r as 5 | 10 | 15 | 25)
                          }
                        />
                      ))}
                    </View>
                  </>
                ) : (
                  <NomText variant="bodyMd" soft center>
                    Max radius reached.
                  </NomText>
                )}
              </>
            ) : (
              <>
                <ActivityIndicator color={theme.action} />
                <NomText
                  variant="displayMd"
                  center
                  style={{ marginTop: SPACE[3] }}
                >
                  loading more venues…
                </NomText>
              </>
            )}
            <NomButton
              label="PREVIEW RESULTS"
              variant="primary"
              trailIcon="share"
              onPress={handlePreviewResults}
            />
          </ScrollView>
        ) : null}
      </View>

      {/* Swipe buttons */}
      {hasMoreCards && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: SPACE[4],
            paddingVertical: SPACE[4],
          }}
        >
          <IconButton name="close" size={58} onPress={handleSwipeLeft} />
          <IconButton name="undo" size={42} onPress={() => { /* no-op for now */ }} />
          <IconButton
            name="heart"
            size={58}
            variant="primary"
            onPress={handleSwipeRight}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
