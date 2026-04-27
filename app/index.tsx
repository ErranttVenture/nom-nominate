import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/theme/ThemeContext';
import { Lockup } from '@/components/nom';
import { SPACE } from '@/theme/tokens';

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
  const theme = useTheme();
  const rootNavState = useRootNavigationState();
  const {
    isAuthenticated,
    isLoading,
    isVerifying,
    pendingPartyId,
    setPendingPartyId,
  } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (isVerifying) return;
    if (!rootNavState?.key) return;

    const navigate = async () => {
      if (!isAuthenticated) {
        router.replace('/auth');
        return;
      }
      if (pendingPartyId) {
        const pid = pendingPartyId;
        setPendingPartyId(null);
        router.replace(`/party/${pid}`);
        return;
      }
      router.replace('/(tabs)');
    };

    navigate();
  }, [isAuthenticated, isLoading, isVerifying, rootNavState?.key]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.bg,
      }}
    >
      <Lockup size={1.1} />
      <View style={{ marginTop: SPACE[6] }}>
        <ActivityIndicator size="small" color={theme.action} />
      </View>
    </View>
  );
}
