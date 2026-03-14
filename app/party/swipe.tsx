import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Alert,
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

export default function SwipeScreen() {
  const { partyId } = useLocalSearchParams<{ partyId: string }>();
  const router = useRouter();
  const party = usePartyStore((s) => s.currentParty);
  const venues = usePartyStore((s) => s.venues);
  const currentVenueIndex = usePartyStore((s) => s.currentVenueIndex);
  const swipeCount = usePartyStore((s) => s.swipeCount);
  const setVenues = usePartyStore((s) => s.setVenues);
  const { loading, partyStatus, nominatedVenueId } = useSwipeSession(partyId!);
  const [expandingRadius, setExpandingRadius] = useState(false);

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

  const incrementSwipeCount = usePartyStore((s) => s.incrementSwipeCount);
  const nextVenueAction = usePartyStore((s) => s.nextVenue);

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

      // Advance card + counter (single source of truth)
      nextVenueAction();
      incrementSwipeCount();

      // Record swipe
      await SwipeService.recordSwipe({
        partyId: partyId!,
        venueId: venue.id,
        direction,
      });
    },
    [partyId, venues, currentVenueIndex, nextVenueAction, incrementSwipeCount]
  );

  const handleSwipeLeft = useCallback(() => handleSwipe('left'), [handleSwipe]);
  const handleSwipeRight = useCallback(() => handleSwipe('right'), [handleSwipe]);

  const handleIncreaseRadius = useCallback(async () => {
    if (!party) return;
    const currentRadius = party.radiusMiles;
    const options = PARTY.RADIUS_OPTIONS;
    const currentIndex = options.indexOf(currentRadius as any);

    if (currentIndex >= options.length - 1) {
      Alert.alert(
        'Maximum Radius',
        'You\'re already searching the maximum radius (25 mi). Try reviewing your results!',
      );
      return;
    }

    const newRadius = options[currentIndex + 1];
    setExpandingRadius(true);

    try {
      // Fetch new venues with expanded radius
      const allVenues = await PartyService.getPartyVenues(partyId!);
      const swipedIds = await SwipeService.getUserSwipedVenueIds(partyId!);
      const unswiped = allVenues.filter((v) => !swipedIds.has(v.id));

      if (unswiped.length === 0) {
        Alert.alert(
          'No New Venues',
          `No additional venues found within ${newRadius} miles. Try reviewing your results!`,
        );
      } else {
        setVenues(unswiped);
        // Reset venue index in the store
        usePartyStore.setState({ currentVenueIndex: 0 });
      }
    } catch (error) {
      console.error('Failed to expand radius:', error);
    } finally {
      setExpandingRadius(false);
    }
  }, [party, partyId, setVenues]);

  const currentVenue = venues[currentVenueIndex];
  const nextVenue = venues[currentVenueIndex + 1];
  const hasMoreCards = currentVenueIndex < venues.length;

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
            <Text style={styles.noMoreEmoji}>🎉</Text>
            <Text style={styles.noMoreTitle}>You've seen them all!</Text>
            <Text style={styles.noMoreSubtitle}>
              You've swiped through all {venues.length} venues in this area.
            </Text>

            {/* Review Results Button */}
            <TouchableOpacity
              style={styles.reviewBtn}
              onPress={() =>
                router.push({ pathname: '/party/results', params: { partyId } })
              }
              activeOpacity={0.7}
            >
              <Text style={styles.reviewBtnText}>Review Results 📊</Text>
            </TouchableOpacity>

            {/* Increase Radius Button */}
            <TouchableOpacity
              style={styles.expandBtn}
              onPress={handleIncreaseRadius}
              disabled={expandingRadius}
              activeOpacity={0.7}
            >
              {expandingRadius ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <Text style={styles.expandBtnText}>Search Wider Area 🗺️</Text>
              )}
            </TouchableOpacity>
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
    paddingHorizontal: 16, overflow: 'hidden',
  },
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
  noMoreCards: { alignItems: 'center', padding: 40 },
  noMoreEmoji: { fontSize: 48, marginBottom: 12 },
  noMoreTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  noMoreSubtitle: {
    fontSize: 15, color: COLORS.textLight, textAlign: 'center', lineHeight: 22,
    marginBottom: 24,
  },
  reviewBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  reviewBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  expandBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  expandBtnText: { color: COLORS.primary, fontSize: 17, fontWeight: '700' },
});
