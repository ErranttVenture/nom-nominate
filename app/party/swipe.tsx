import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS, PARTY } from '@/constants';
import { usePartyStore } from '@/stores/partyStore';
import { useSwipeSession } from '@/hooks/useSwipeSession';
import { CardStack } from '@/components/cards/CardStack';
import { SwipeService, PartyService } from '@/lib/services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = PARTY.MIN_SWIPES_FOR_FALLBACK; // 20

export default function SwipeScreen() {
  const { partyId } = useLocalSearchParams<{ partyId: string }>();
  const router = useRouter();
  const party = usePartyStore((s) => s.currentParty);
  const swipeCount = usePartyStore((s) => s.swipeCount);
  const { loading, partyStatus, nominatedVenueId, venuesExhausted, venuesFetched, currentVenue, nextVenue, advanceQueue } =
    useSwipeSession(partyId!);

  const [swiping, setSwiping] = useState(false);
  const [expandingRadius, setExpandingRadius] = useState(false);

  // Animated progress bar width
  const progressAnim = useState(() => new Animated.Value(0))[0];

  // Animate progress bar when swipeCount changes
  useEffect(() => {
    const progress = Math.min(swipeCount / SWIPE_THRESHOLD, 1);
    Animated.spring(progressAnim, {
      toValue: progress,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [swipeCount]);

  // React to nomination status changes (from any source — unanimous or fallback)
  useEffect(() => {
    if (partyStatus === 'nominated' && nominatedVenueId) {
      router.replace({
        pathname: '/party/success',
        params: { partyId, venueId: nominatedVenueId },
      });
    } else if (partyStatus === 'results') {
      router.replace({
        pathname: '/party/results',
        params: { partyId },
      });
    }
  }, [partyStatus, nominatedVenueId]);

  const incrementSwipeCount = usePartyStore((s) => s.incrementSwipeCount);

  const handleSwipe = useCallback(
    async (direction: 'left' | 'right') => {
      if (!currentVenue || swiping) return;

      const venue = currentVenue;
      setSwiping(true);

      // Haptic feedback
      if (direction === 'right') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Advance queue + counter immediately for snappy UX
      // advanceQueue marks as seen and refills in the background
      advanceQueue();
      incrementSwipeCount();

      try {
        // Record swipe — this also checks for unanimous nomination
        const result = await SwipeService.recordSwipe({
          partyId: partyId!,
          venueId: venue.id,
          direction,
        });

        // If unanimous win happened, the party snapshot listener will redirect us.
        // But let's also check fallback after reaching the threshold.
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
  const handleSwipeRight = useCallback(() => handleSwipe('right'), [handleSwipe]);

  const handlePreviewResults = useCallback(() => {
    router.push({ pathname: '/party/results', params: { partyId } });
  }, [partyId, router]);

  const handleExpandRadius = useCallback(async (newRadius: 5 | 10 | 15 | 25) => {
    setExpandingRadius(true);
    try {
      await PartyService.expandRadius(partyId!, newRadius);
      // Queue will auto-refill from the new pool on next prepareQueue cycle
    } catch (error) {
      console.error('[Swipe] Error expanding radius:', error);
    } finally {
      setExpandingRadius(false);
    }
  }, [partyId]);

  const hasMoreCards = !!currentVenue;
  const reachedThreshold = swipeCount >= SWIPE_THRESHOLD;

  // Determine which empty state to show
  // "No Restaurants Found" = initial fetch returned 0 (venue pool was never populated)
  const neverHadVenues = !loading && !currentVenue && (venuesFetched ?? 0) === 0;
  // "Ran out" = had venues, swiped through them all
  const ranOutOfVenues = !loading && !hasMoreCards && !neverHadVenues;

  // Available radius options larger than current
  const currentRadius = party?.radiusMiles ?? PARTY.DEFAULT_RADIUS_MILES;
  const largerRadiusOptions = PARTY.RADIUS_OPTIONS.filter((r) => r > currentRadius);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding restaurants near you...</Text>
      </View>
    );
  }

  // No restaurants found at all (initial fetch returned 0)
  if (neverHadVenues) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>😕</Text>
          <Text style={styles.emptyTitle}>No Restaurants Found</Text>
          <Text style={styles.emptySubtitle}>
            We couldn't find any restaurants in this area.{'\n'}
            Try creating a party with a different location.
          </Text>
          <TouchableOpacity
            style={styles.goHomeBtn}
            onPress={() => router.replace('/')}
            activeOpacity={0.7}
          >
            <Text style={styles.goHomeBtnText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace(`/party/${partyId}`)}
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.partyName} numberOfLines={1}>
          {party?.name}
        </Text>
      </View>

      {/* Progress Bar / Preview Results Message */}
      <View style={styles.progressContainer}>
        {reachedThreshold ? (
          <View style={styles.thresholdRow}>
            <Text style={styles.thresholdText}>Great job! Keep swiping or</Text>
            <TouchableOpacity
              onPress={handlePreviewResults}
              activeOpacity={0.7}
            >
              <Text style={styles.previewResultsLink}>Preview Results 📊</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.progressBarOuter}>
            <Animated.View
              style={[
                styles.progressBarInner,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
            <Text style={styles.progressText}>
              {swipeCount} / {SWIPE_THRESHOLD}
            </Text>
          </View>
        )}
      </View>

      {/* Card Stack */}
      <View style={styles.cardContainer}>
        {hasMoreCards ? (
          <CardStack
            currentVenue={currentVenue}
            nextVenue={nextVenue}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
          />
        ) : ranOutOfVenues ? (
          <View style={styles.waitingState}>
            {venuesExhausted ? (
              // All shifts exhausted → prompt to expand radius
              <>
                <Text style={styles.waitingEmoji}>🔍</Text>
                <Text style={styles.waitingTitle}>
                  You've seen all {venuesFetched} venues within {currentRadius} miles!
                </Text>
                {largerRadiusOptions.length > 0 ? (
                  <>
                    <Text style={styles.waitingSubtitle}>
                      Want to expand your search?
                    </Text>
                    <View style={styles.radiusOptionsRow}>
                      {largerRadiusOptions.map((r) => (
                        <TouchableOpacity
                          key={r}
                          style={styles.radiusOptionBtn}
                          onPress={() => handleExpandRadius(r as 5 | 10 | 15 | 25)}
                          disabled={expandingRadius}
                          activeOpacity={0.7}
                        >
                          {expandingRadius ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.radiusOptionText}>{r} mi</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : (
                  <Text style={styles.waitingSubtitle}>
                    You've reached the maximum search radius.
                  </Text>
                )}
              </>
            ) : (
              // Still fetching more via coordinate shifts
              <>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.waitingTitle}>Loading more venues...</Text>
                <Text style={styles.waitingSubtitle}>
                  Fetching more restaurants in your area.
                </Text>
              </>
            )}

            <TouchableOpacity
              style={styles.previewResultsBtnLarge}
              onPress={handlePreviewResults}
              activeOpacity={0.7}
            >
              <Text style={styles.previewResultsBtnLargeText}>Preview Results 📊</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {/* Swipe Buttons */}
      {hasMoreCards && (
        <View style={styles.swipeButtons}>
          <TouchableOpacity
            style={[styles.swipeBtn, styles.nopeBtn]}
            onPress={handleSwipeLeft}
            activeOpacity={0.7}
          >
            <Text style={styles.nopeBtnText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.swipeBtn, styles.likeBtn]}
            onPress={handleSwipeRight}
            activeOpacity={0.7}
          >
            <Text style={styles.likeBtnText}>♥</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: { marginTop: 12, fontSize: 15, color: COLORS.textLight },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingBottom: 4, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  backBtnText: { fontSize: 18 },
  partyName: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },

  // Progress bar
  progressContainer: {
    paddingHorizontal: 24, paddingVertical: 8,
  },
  progressBarOuter: {
    height: 36,
    backgroundColor: '#e9ecef',
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarInner: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 18,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    zIndex: 1,
  },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  thresholdText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  previewResultsLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },

  // Card area
  cardContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 16, overflow: 'hidden',
  },

  // Swipe buttons
  swipeButtons: {
    flexDirection: 'row', justifyContent: 'center', gap: 40,
    paddingVertical: 16, paddingBottom: 40, zIndex: 10,
  },
  swipeBtn: {
    width: 64, height: 64, borderRadius: 32,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 5,
  },
  nopeBtn: { backgroundColor: '#fff' },
  nopeBtnText: { fontSize: 28, color: COLORS.danger },
  likeBtn: { backgroundColor: '#fff' },
  likeBtnText: { fontSize: 28, color: COLORS.success },

  // Empty state (no venues at all — initial fetch returned 0)
  emptyState: { alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: {
    fontSize: 15, color: COLORS.textLight, textAlign: 'center', lineHeight: 22,
    marginBottom: 24,
  },
  goHomeBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 16,
    borderRadius: 16, alignItems: 'center',
  },
  goHomeBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Waiting state (ran out of cards — loading more or expand radius)
  waitingState: { alignItems: 'center', padding: 40 },
  waitingEmoji: { fontSize: 48, marginBottom: 12 },
  waitingTitle: {
    fontSize: 20, fontWeight: '700', color: COLORS.text,
    marginBottom: 8, marginTop: 12, textAlign: 'center',
  },
  waitingSubtitle: {
    fontSize: 15, color: COLORS.textLight, textAlign: 'center', lineHeight: 22,
    marginBottom: 24,
  },

  // Radius expansion options
  radiusOptionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  radiusOptionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    minWidth: 70,
    alignItems: 'center',
  },
  radiusOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  previewResultsBtnLarge: {
    backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 16,
    borderRadius: 16, width: '100%', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 5,
  },
  previewResultsBtnLargeText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
