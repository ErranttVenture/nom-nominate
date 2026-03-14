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
import { CardStack } from '@/components/cards/CardStack';
import { usePartyStore } from '@/stores/partyStore';
import { geocodeZipCode } from '@/lib/api/geocoding';
import { searchVenues } from '@/lib/api/places';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SoloBrowseScreen() {
  const { zipCode, radius } = useLocalSearchParams<{ zipCode: string; radius: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currentRadiusMiles, setCurrentRadiusMiles] = useState(parseInt(radius || '10', 10));

  const { venues, currentVenueIndex, swipeCount, setVenues } = usePartyStore();
  const incrementSwipeCount = usePartyStore((s) => s.incrementSwipeCount);
  const nextVenueAction = usePartyStore((s) => s.nextVenue);
  const addSoloFavorite = usePartyStore((s) => s.addSoloFavorite);
  const soloFavorites = usePartyStore((s) => s.soloFavorites);
  const clearSoloFavorites = usePartyStore((s) => s.clearSoloFavorites);

  useEffect(() => {
    // Clear previous solo favorites when starting a new session
    clearSoloFavorites();

    const loadVenues = async () => {
      try {
        const geo = await geocodeZipCode(zipCode || '14214');
        setCoords(geo);
        const radiusMiles = parseInt(radius || '10', 10);
        const radiusMeters = radiusMiles * 1609.34;
        const results = await searchVenues({
          lat: geo.lat,
          lng: geo.lng,
          radiusMeters,
        });
        setVenues(results);
        setSeenIds(new Set(results.map((v) => v.id)));
        usePartyStore.setState({ currentVenueIndex: 0, swipeCount: 0 });
      } catch (error) {
        console.error('Failed to load venues:', error);
        Alert.alert('Error', 'Could not load restaurants for this area. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    loadVenues();
  }, [zipCode, radius]);

  const handleLoadMore = useCallback(async () => {
    if (!coords || loadingMore) return;

    // Expand radius by 5 miles to find new venues
    const newRadius = currentRadiusMiles + 5;
    setLoadingMore(true);

    try {
      const results = await searchVenues({
        lat: coords.lat,
        lng: coords.lng,
        radiusMeters: newRadius * 1609.34,
      });

      // Filter out venues we've already seen
      const newVenues = results.filter((v) => !seenIds.has(v.id));

      if (newVenues.length === 0) {
        Alert.alert(
          'No New Restaurants',
          `No additional restaurants found within ${newRadius} miles. Try a different area!`,
        );
      } else {
        // Add new IDs to seen set
        setSeenIds((prev) => {
          const updated = new Set(prev);
          newVenues.forEach((v) => updated.add(v.id));
          return updated;
        });
        // Append new venues and reset index to continue swiping
        setVenues(newVenues);
        usePartyStore.setState({ currentVenueIndex: 0, swipeCount: 0 });
        setCurrentRadiusMiles(newRadius);
      }
    } catch (error) {
      console.error('Failed to load more venues:', error);
      Alert.alert('Error', 'Could not load more restaurants. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  }, [coords, loadingMore, currentRadiusMiles, seenIds, setVenues]);

  const handleSwipeLeft = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    nextVenueAction();
    incrementSwipeCount();
  }, [nextVenueAction, incrementSwipeCount]);

  const handleSwipeRight = useCallback(() => {
    const venue = venues[currentVenueIndex];
    if (venue) {
      addSoloFavorite(venue);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    nextVenueAction();
    incrementSwipeCount();
  }, [venues, currentVenueIndex, nextVenueAction, incrementSwipeCount, addSoloFavorite]);

  const handleShowResults = useCallback(() => {
    router.push('/solo/results');
  }, [router]);

  const currentVenue = venues[currentVenueIndex];
  const nextVenue = venues[currentVenueIndex + 1];
  const hasMoreCards = currentVenueIndex < venues.length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding restaurants...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.replace('/')}>
          <Text style={styles.headerBtnText}>🏠</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solo Browse</Text>
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
            <Text style={styles.noMoreTitle}>Batch complete!</Text>
            <Text style={styles.noMoreSubtitle}>
              You liked {soloFavorites.length} restaurant{soloFavorites.length !== 1 ? 's' : ''} so far. Want to see more nearby?
            </Text>

            {/* Show Results Button (primary) */}
            <TouchableOpacity
              style={styles.showResultsBtn}
              onPress={handleShowResults}
              activeOpacity={0.7}
            >
              <Text style={styles.showResultsBtnText}>
                Show me results ({soloFavorites.length})
              </Text>
            </TouchableOpacity>

            {/* Load More Button */}
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={handleLoadMore}
              disabled={loadingMore}
              activeOpacity={0.7}
            >
              {loadingMore ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <Text style={styles.loadMoreBtnText}>
                  Find More Restaurants ({currentRadiusMiles + 5} mi)
                </Text>
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

      {/* Favorites count */}
      {hasMoreCards && soloFavorites.length > 0 && (
        <View style={styles.favoritesBar}>
          <Text style={styles.favoritesText}>♥ {soloFavorites.length} favorites</Text>
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 24, paddingBottom: 8, gap: 12,
  },
  headerBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  headerBtnText: { fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 },
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
  showResultsBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32, paddingVertical: 16,
    borderRadius: 16, width: '100%', alignItems: 'center',
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 5,
  },
  showResultsBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  loadMoreBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 32, paddingVertical: 16,
    borderRadius: 16, width: '100%', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.primary,
  },
  loadMoreBtnText: { color: COLORS.primary, fontSize: 17, fontWeight: '700' },
  favoritesBar: {
    position: 'absolute', bottom: 110, alignSelf: 'center',
    backgroundColor: COLORS.success, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 14,
  },
  favoritesText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
