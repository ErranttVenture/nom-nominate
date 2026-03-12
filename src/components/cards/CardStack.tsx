import React, { useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { VenueCard } from './VenueCard';
import { usePartyStore } from '@/stores/partyStore';
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
  const nextVenueAction = usePartyStore((s) => s.nextVenue);
  const incrementSwipeCount = usePartyStore((s) => s.incrementSwipeCount);

  const handleSwipeLeft = useCallback(
    (_venueId: string) => {
      nextVenueAction();
      incrementSwipeCount();
      onSwipeLeft();
    },
    [onSwipeLeft, nextVenueAction, incrementSwipeCount]
  );

  const handleSwipeRight = useCallback(
    (_venueId: string) => {
      nextVenueAction();
      incrementSwipeCount();
      onSwipeRight();
    },
    [onSwipeRight, nextVenueAction, incrementSwipeCount]
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
