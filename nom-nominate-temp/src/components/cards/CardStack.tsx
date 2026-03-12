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
 * Renders a stack of venue cards with the current card on top
 * and the next card visible behind it (scaled down slightly).
 */
export function CardStack({
  currentVenue,
  nextVenue,
  onSwipeLeft,
  onSwipeRight,
}: CardStackProps) {
  // NOTE: Do NOT call nextVenue/incrementSwipeCount here — the parent
  // swipe.tsx already handles advancing the store after recording the swipe.
  // Calling it in both places caused a double-advance bug.

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
      {/* Next card (behind) */}
      {nextVenue && (
        <View style={styles.nextCard} pointerEvents="none">
          <VenueCard
            venue={nextVenue}
            onSwipeLeft={() => {}}
            onSwipeRight={() => {}}
          />
        </View>
      )}

      {/* Current card (on top) */}
      <VenueCard
        key={currentVenue.id}
        venue={currentVenue}
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        isPriority={(currentVenue as any).priorityScore > 0}
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
  nextCard: {
    position: 'absolute',
    transform: [{ scale: 0.95 }, { translateY: 10 }],
    opacity: 0.85,
  },
});
