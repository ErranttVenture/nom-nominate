import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface VenueCardProps {
  venue: Venue;
  onSwipeLeft: (venueId: string) => void;
  onSwipeRight: (venueId: string) => void;
}

export function VenueCard({ venue, onSwipeLeft, onSwipeRight }: VenueCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.3; // dampen vertical movement
    })
    .onEnd((event) => {
      if (translateX.value > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 300 });
        runOnJS(onSwipeRight)(venue.id);
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 300 });
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
      { rotate: `${interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-15, 0, 15])}deg` },
    ],
  }));

  const likeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const nopeOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  const priceDisplay = '$'.repeat(venue.priceLevel || 1);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, cardStyle]}>
        {/* Swipe labels */}
        <Animated.View style={[styles.label, styles.likeLabel, likeOpacity]}>
          <Text style={styles.likeLabelText}>YUM</Text>
        </Animated.View>
        <Animated.View style={[styles.label, styles.nopeLabel, nopeOpacity]}>
          <Text style={styles.nopeLabelText}>NOPE</Text>
        </Animated.View>

        {/* Venue image */}
        <View style={styles.imageContainer}>
          {venue.photoUrl ? (
            <Image source={{ uri: venue.photoUrl }} style={styles.image} />
          ) : (
            <View style={[styles.image, styles.placeholderImage]}>
              <Text style={styles.placeholderEmoji}>🍽️</Text>
            </View>
          )}

          {/* Sponsored offer badge */}
          {venue.hasOffer && (
            <View style={styles.offerBadge}>
              <Text style={styles.offerBadgeText}>✨ OFFER</Text>
            </View>
          )}
        </View>

        {/* Venue details */}
        <View style={styles.details}>
          <Text style={styles.name}>{venue.name}</Text>
          <Text style={styles.cuisine}>{venue.cuisine}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaItem}>⭐ {venue.rating}</Text>
            <Text style={styles.metaItem}>{priceDisplay}</Text>
            <Text style={styles.metaItem}>📍 {venue.distanceMiles} mi</Text>
          </View>

          {/* Offer strip */}
          {venue.offer && (
            <View style={styles.offerStrip}>
              <Text style={styles.offerIcon}>🎁</Text>
              <Text style={styles.offerText}>{venue.offer.title}</Text>
              <Text style={styles.offerCta}>View →</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - 32,
    height: 520,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  imageContainer: {
    height: 280,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    backgroundColor: '#e17055',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 60,
  },
  label: {
    position: 'absolute',
    top: '40%',
    zIndex: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 4,
  },
  likeLabel: {
    left: 24,
    borderColor: '#2ECC71',
    transform: [{ rotate: '-15deg' }],
  },
  likeLabelText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#2ECC71',
  },
  nopeLabel: {
    right: 24,
    borderColor: '#E74C3C',
    transform: [{ rotate: '15deg' }],
  },
  nopeLabelText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#E74C3C',
  },
  priorityBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(46, 204, 113, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  priorityText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  offerBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#f0932b',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  offerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  details: {
    padding: 20,
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2d3436',
    marginBottom: 4,
  },
  cuisine: {
    fontSize: 14,
    color: '#636e72',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    fontSize: 13,
    color: '#2d3436',
  },
  offerStrip: {
    marginTop: 12,
    padding: 10,
    backgroundColor: 'rgba(240, 147, 43, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(240, 147, 43, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offerIcon: {
    fontSize: 16,
  },
  offerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#f0932b',
  },
  offerCta: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B35',
  },
});
