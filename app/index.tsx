import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/authStore';
import { COLORS } from '@/constants';

const TUTORIAL_SEEN_KEY = 'nom_tutorial_seen';

/**
 * Root index — splash/loading screen.
 * Redirects to tutorial (first time), auth, or home based on state.
 */
export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading, isVerifying } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    // Don't navigate while phone verification is in progress —
    // Android auto-verify can sign in the user mid-flow, which
    // would cause a premature redirect away from auth.tsx.
    if (isVerifying) return;

    const checkTutorial = async () => {
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
        router.replace('/(tabs)');
      } else {
        router.replace('/auth');
      }
    };

    checkTutorial();
  }, [isAuthenticated, isLoading, isVerifying]);

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
