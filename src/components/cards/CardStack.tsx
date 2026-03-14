import React, { useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { VenueCard } from './VenueCard';
import type { Venue } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CardStackProps {
  currentVenue: Venue;
  nextVenue?: Venue;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

/**
 * Renders a single venue card at a time.
 *
 * NOTE: State changes (nextVenue, incrementSwipeCount) are owned by the
 * parent screen — CardStack just forwards the gesture callbacks.
 */
export function CardStack({
  currentVenue,
  onSwipeLeft,
  onSwipeRight,
}: CardStackProps) {
  const handleSwipeLeft = useCallback(
    (_venueId: string) => {
      onSwipeLeft();
    },
    [onSwipeLeft]
  );

  const handleSwipeRight = useCallback(
    (_venueId: string) => {
      onSwipeRight();
    },
    [onSwipeRight]
  );

  return (
    <View style={styles.container}>
      <VenueCard
        key={currentVenue.id}
        venue={currentVenue}
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: SCREEN_WIDTH,
  },
});
