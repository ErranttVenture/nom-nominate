import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS, PARTY } from '@/constants';
import { usePartyStore } from '@/stores/partyStore';
import { useSwipeSession } from '@/hooks/useSwipeSession';
import { CardStack } from '@/components/cards/CardStack';
import { SwipeService } from '@/lib/services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SwipeScreen() {
  const { partyId } = useLocalSearchParams<{ partyId: string }>();
  const router = useRouter();
  const { party, venues, currentVenueIndex, swipeCount } = usePartyStore();
  const { loading, partyStatus, nominatedVenueId } = useSwipeSession(partyId!);

  // React to nomination or results status changes
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

  const handleSwipe = useCallback(
    async (direction: 'left' | 'right') => {
      const venue = venues[currentVenueIndex];
      if (!venue) return;

      // Haptic feedback
      if (direction === 'right') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Record swipe
      await SwipeService.recordSwipe({
        partyId: partyId!,
        venueId: venue.id,
        direction,
      });
    },
    [partyId, venues, currentVenueIndex]
  );

  const handleSwipeLeft = useCallback(() => handleSwipe('left'), [handleSwipe]);
  const handleSwipeRight = useCallback(() => handleSwipe('right'), [handleSwipe]);

  const currentVenue = venues[currentVenueIndex];
  const nextVenue = venues[currentVenueIndex + 1];
  const hasMoreCards = currentVenueIndex < venues.length;
  const showFallbackBanner = swipeCount >= PARTY.MIN_SWIPES_FOR_FALLBACK;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading venues...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.partyName} numberOfLines={1}>
          {party?.name}
        </Text>
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {swipeCount} / {venues.length}
          </Text>
        </View>
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
        ) : (
          <View style={styles.noMoreCards}>
            <Text style={styles.noMoreEmoji}>🤷</Text>
            <Text style={styles.noMoreTitle}>No more venues</Text>
            <Text style={styles.noMoreSubtitle}>
              We've shown you all the venues in this area.
            </Text>
          </View>
        )}
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

      {/* Fallback "Show Results" Banner */}
      {showFallbackBanner && (
        <TouchableOpacity
          style={styles.resultsBanner}
          onPress={() =>
            router.push({ pathname: '/party/results', params: { partyId } })
          }
        >
          <Text style={styles.resultsBannerText}>Show Results 📊</Text>
        </TouchableOpacity>
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
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingBottom: 8,
  },
  partyName: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  counter: {
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 10,
  },
  counterText: { fontSize: 13, fontWeight: '600', color: COLORS.textLight },
  cardContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 16,
  },
  swipeButtons: {
    flexDirection: 'row', justifyContent: 'center', gap: 40,
    paddingVertical: 16, paddingBottom: 40,
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
  noMoreCards: { alignItems: 'center', padding: 40 },
  noMoreEmoji: { fontSize: 48, marginBottom: 12 },
  noMoreTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  noMoreSubtitle: {
    fontSize: 15, color: COLORS.textLight, textAlign: 'center', lineHeight: 22,
  },
  resultsBanner: {
    position: 'absolute', bottom: 120, alignSelf: 'center',
    backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 20,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 5,
  },
  resultsBannerText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
