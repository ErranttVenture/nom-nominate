import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/authStore';
import { COLORS } from '@/constants';

const TUTORIAL_SEEN_KEY = 'nom_tutorial_seen';

/**
 * Root index — splash/loading screen.
 * Redirects to tutorial (first time), auth, or home based on state.
 *
 * IMPORTANT: Expo Router may have already navigated to a deep link
 * target (e.g. /party/[id]) before this effect runs.  We check
 * navigationState to avoid clobbering that navigation.
 */
export default function Index() {
  const router = useRouter();
  const rootNavState = useRootNavigationState();
  const { isAuthenticated, isLoading, isVerifying, pendingPartyId, setPendingPartyId } =
    useAuthStore();

  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) return;

    // Don't navigate during phone verification
    if (isVerifying) return;

    // Wait for the navigation state to be ready
    if (!rootNavState?.key) return;

    const navigate = async () => {
      // First-time tutorial check
      try {
        const seen = await AsyncStorage.getItem(TUTORIAL_SEEN_KEY);
        if (!seen) {
          await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
          router.replace('/tutorial');
          return;
        }
      } catch {
        // AsyncStorage not available — skip tutorial check
      }

      if (isAuthenticated) {
        // If there's a pending party from a deep link that arrived
        // before the user was authenticated, navigate there now.
        if (pendingPartyId) {
          const pid = pendingPartyId;
          setPendingPartyId(null);
          router.replace(`/party/${pid}`);
        } else {
          router.replace('/(tabs)');
        }
      } else {
        router.replace('/auth');
      }
    };

    navigate();
  }, [isAuthenticated, isLoading, isVerifying, rootNavState?.key]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.dark,
  },
});
