/**
 * Solo Browse — same CardStack as party swipe, but for a single user.
 * Favorites pile up locally until they hit /solo/results.
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { CardStack } from '@/components/cards/CardStack';
import { usePartyStore } from '@/stores/partyStore';
import { geocodeZipCode } from '@/lib/api/geocoding';
import { searchVenues } from '@/lib/api/places';
import { NomText } from '@/theme/NomText';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACE, STROKE } from '@/theme/tokens';
import { IconButton, NomButton, Sticker } from '@/components/nom';

export default function SoloBrowseScreen() {
  const { zipCode, radius } = useLocalSearchParams<{
    zipCode: string;
    radius: string;
  }>();
  const router = useRouter();
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [currentRadiusMiles, setCurrentRadiusMiles] = useState(
    parseInt(radius || '10', 10)
  );

  const { venues, currentVenueIndex, swipeCount, setVenues } = usePartyStore();
  const incrementSwipeCount = usePartyStore((s) => s.incrementSwipeCount);
  const nextVenueAction = usePartyStore((s) => s.nextVenue);
  const addSoloFavorite = usePartyStore((s) => s.addSoloFavorite);
  const soloFavorites = usePartyStore((s) => s.soloFavorites);
  const clearSoloFavorites = usePartyStore((s) => s.clearSoloFavorites);

  useEffect(() => {
    clearSoloFavorites();
    usePartyStore.setState({
      currentParty: null,
      members: [],
      results: [],
    });

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
        Alert.alert(
          'Error',
          "couldn't load restaurants for this area. try again."
        );
      } finally {
        setLoading(false);
      }
    };
    loadVenues();
  }, [zipCode, radius]);

  const handleLoadMore = useCallback(async () => {
    if (!coords || loadingMore) return;

    const newRadius = currentRadiusMiles + 5;
    setLoadingMore(true);

    try {
      const results = await searchVenues({
        lat: coords.lat,
        lng: coords.lng,
        radiusMeters: newRadius * 1609.34,
      });

      const newVenues = results.filter((v) => !seenIds.has(v.id));

      if (newVenues.length === 0) {
        Alert.alert(
          'No New Restaurants',
          `No additional restaurants found within ${newRadius} miles. Try a different area!`
        );
      } else {
        setSeenIds((prev) => {
          const updated = new Set(prev);
          newVenues.forEach((v) => updated.add(v.id));
          return updated;
        });
        setVenues(newVenues);
        usePartyStore.setState({ currentVenueIndex: 0, swipeCount: 0 });
        setCurrentRadiusMiles(newRadius);
      }
    } catch (error) {
      console.error('Failed to load more venues:', error);
      Alert.alert('Error', "couldn't load more restaurants. try again.");
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
    if (venue) addSoloFavorite(venue);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    nextVenueAction();
    incrementSwipeCount();
  }, [
    venues,
    currentVenueIndex,
    nextVenueAction,
    incrementSwipeCount,
    addSoloFavorite,
  ]);

  const handleShowResults = useCallback(() => {
    router.push('/solo/results');
  }, [router]);

  const currentVenue = venues[currentVenueIndex];
  const nextVenue = venues[currentVenueIndex + 1];
  const hasMoreCards = currentVenueIndex < venues.length;

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.bg,
        }}
      >
        <ActivityIndicator size="large" color={theme.action} />
        <NomText variant="bodyMd" soft style={{ marginTop: SPACE[3] }}>
          finding restaurants...
        </NomText>
      </View>
    );
  }

  const progress =
    venues.length > 0 ? Math.min(1, swipeCount / venues.length) : 0;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={['top']}
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
        <NomText
          variant="monoSm"
          soft
          uppercase
          style={{ flex: 1, letterSpacing: 1.5 }}
        >
          SOLO ROUND
        </NomText>
        <NomText variant="monoSm" soft uppercase>
          {swipeCount} / {venues.length}
        </NomText>
      </View>

      {/* Progress bar */}
      <View
        style={{
          marginHorizontal: SPACE[5],
          height: 8,
          borderWidth: STROKE.std,
          borderColor: theme.borderStrong,
          borderRadius: RADIUS.sm,
          backgroundColor: theme.surface,
          overflow: 'hidden',
          marginBottom: SPACE[3],
        }}
      >
        <View
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            backgroundColor: theme.action,
          }}
        />
      </View>

      {/* Card Stack */}
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: SPACE[4],
          overflow: 'hidden',
        }}
      >
        {hasMoreCards ? (
          <CardStack
            currentVenue={currentVenue}
            nextVenue={nextVenue}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
          />
        ) : (
          <View style={{ alignItems: 'center', padding: SPACE[8] }}>
            <Sticker
              color={theme.warn}
              rotation={-4}
              paddingX={16}
              paddingY={4}
              variant="displayLg"
            >
              batch done!
            </Sticker>
            <NomText
              variant="displayXL"
              center
              style={{ marginTop: SPACE[5] }}
            >
              all caught up
            </NomText>
            <NomText
              variant="bodyLg"
              soft
              center
              style={{ marginTop: SPACE[2], maxWidth: 280 }}
            >
              you've seen everything within reach. expand the radius or start
              a new round.
            </NomText>

            <View style={{ width: '100%', marginTop: SPACE[6] }}>
              <NomButton
                label={`SHOW RESULTS (${soloFavorites.length})`}
                variant="primary"
                stretch
                onPress={handleShowResults}
              />
            </View>
            <View style={{ width: '100%', marginTop: SPACE[3] }}>
              <NomButton
                label={`FIND MORE (${currentRadiusMiles + 5} MI)`}
                variant="secondary"
                stretch
                loading={loadingMore}
                onPress={handleLoadMore}
              />
            </View>
          </View>
        )}
      </View>

      {/* Swipe buttons */}
      {hasMoreCards && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: SPACE[6],
            paddingVertical: SPACE[4],
            paddingBottom: SPACE[6],
          }}
        >
          <IconButton
            name="close"
            size={64}
            variant="destruct"
            onPress={handleSwipeLeft}
          />
          <IconButton
            name="heart"
            size={64}
            variant="primary"
            onPress={handleSwipeRight}
          />
        </View>
      )}

      {/* Favorites bar */}
      {hasMoreCards && soloFavorites.length > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 128,
            alignSelf: 'center',
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
        >
          <Sticker
            color={theme.match}
            rotation={-3}
            paddingX={14}
            paddingY={2}
            variant="headingMd"
          >
            {`♥ ${soloFavorites.length} saved · keep going`}
          </Sticker>
        </View>
      )}
    </SafeAreaView>
  );
}
