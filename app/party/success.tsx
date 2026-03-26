import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/constants';
import { useNominatedVenue } from '@/hooks/useNominatedVenue';

export default function SuccessScreen() {
  const { partyId, venueId } = useLocalSearchParams<{ partyId: string; venueId: string }>();
  const router = useRouter();
  const { venue, party } = useNominatedVenue(partyId!, venueId!);

  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -12,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const priceDisplay = venue ? '$'.repeat(venue.priceLevel || 1) : '';

  return (
    <View style={styles.container}>
      {/* Celebration Emoji */}
      <Animated.Text
        style={[styles.emoji, { transform: [{ translateY: bounceAnim }] }]}
      >
        🎉
      </Animated.Text>

      {/* Title */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.title}>A Nom has been{'\n'}Nominated!</Text>
        <Text style={styles.subtitle}>
          {party?.nominatedVenueVotes != null && party.memberIds
            ? party.nominatedVenueVotes >= party.memberIds.length
              ? 'Everyone agreed — let\'s eat!'
              : `${party.nominatedVenueVotes} out of ${party.memberIds.length} members voted for this spot!`
            : 'Let\'s eat!'}
        </Text>
      </Animated.View>

      {/* Venue Card */}
      {venue && (
        <Animated.View style={[styles.venueCard, { opacity: fadeAnim }]}>
          <Text style={styles.venueName}>🍽️ {venue.name}</Text>
          <Text style={styles.venueInfo}>
            {venue.cuisine} · ⭐ {venue.rating} · {priceDisplay} · {venue.distanceMiles} mi
          </Text>
          <Text style={[styles.venueInfo, { marginTop: 8 }]}>
            📍 {venue.address}
          </Text>
          {venue.isOpenOnDate !== undefined && (
            <Text style={styles.venueInfo}>
              🕐 {venue.isOpenOnDate ? 'Open on selected date' : 'Hours vary'}
            </Text>
          )}
        </Animated.View>
      )}

      {/* Actions */}
      <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={styles.primaryBtnText}>Back to Parties</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() =>
            router.push({ pathname: '/party/results', params: { partyId } })
          }
        >
          <Text style={styles.secondaryBtnText}>View All Results</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emoji: { fontSize: 80, marginBottom: 16 },
  title: {
    fontSize: 32, fontWeight: '800', color: '#fff',
    textAlign: 'center', marginBottom: 8,
  },
  subtitle: {
    fontSize: 16, color: 'rgba(255,255,255,0.6)',
    textAlign: 'center', marginBottom: 32,
  },
  venueCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    width: '100%', marginBottom: 32,
  },
  venueName: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  venueInfo: { fontSize: 14, color: COLORS.textLight, marginTop: 4 },
  actions: { width: '100%' },
  primaryBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16,
    padding: 18, alignItems: 'center', marginBottom: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16, padding: 18, alignItems: 'center',
  },
  secondaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
