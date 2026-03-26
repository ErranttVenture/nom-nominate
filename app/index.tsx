import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { COLORS } from '@/constants';

/**
 * Root index — splash/loading screen.
 * Redirects to auth (if not logged in), tutorial (first time after auth),
 * or home based on state.
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
      // Auth check FIRST — if not logged in, go to auth
      if (!isAuthenticated) {
        router.replace('/auth');
        return;
      }

      // Authenticated — check for pending deep link party
      if (pendingPartyId) {
        const pid = pendingPartyId;
        setPendingPartyId(null);
        router.replace(`/party/${pid}`);
        return;
      }

      // Authenticated, no pending party — go home
      router.replace('/(tabs)');
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
