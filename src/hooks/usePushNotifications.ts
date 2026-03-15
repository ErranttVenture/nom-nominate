import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Platform } from 'react-native';
import { USE_MOCK } from '@/lib/services';

/**
 * Set up push notification handling.
 * - Request permission
 * - Handle foreground notifications
 * - Handle background tap-to-open notifications
 *
 * Safely skipped in mock mode to avoid importing Firebase when it isn't initialized.
 */
export function usePushNotifications() {
  const router = useRouter();

  useEffect(() => {
    // Skip entirely in mock mode — Firebase is not initialized
    if (USE_MOCK) {
      return;
    }

    let unsubTokenRefresh: (() => void) | undefined;
    let unsubForeground: (() => void) | undefined;
    let unsubBackground: (() => void) | undefined;

    const setup = async () => {
      try {
        // Dynamic import so Firebase is never loaded in mock mode
        const messaging = (await import('@react-native-firebase/messaging')).default;
        const { saveFCMToken } = await import('@/lib/firebase/auth');

        // Request permission (iOS)
        if (Platform.OS === 'ios') {
          const authStatus = await messaging().requestPermission();
          const enabled =
            authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
            authStatus === messaging.AuthorizationStatus.PROVISIONAL;

          if (!enabled) {
            console.log('Push notification permission denied');
          }
        }

        // Handle token refresh
        unsubTokenRefresh = messaging().onTokenRefresh(async (token) => {
          await saveFCMToken(token);
        });

        // Handle foreground notifications
        unsubForeground = messaging().onMessage(async (remoteMessage) => {
          const { title, body } = remoteMessage.notification ?? {};
          const { partyId, type } = remoteMessage.data ?? {};

          if (type === 'nomination') {
            Alert.alert(title ?? 'Nomination!', body ?? 'A nom has been nominated!', [
              { text: 'Dismiss', style: 'cancel' },
              {
                text: 'View',
                onPress: () => {
                  if (partyId) {
                    router.push({
                      pathname: '/party/success',
                      params: { partyId: partyId as string },
                    });
                  }
                },
              },
            ]);
          }
        });

        // Handle notification tap when app is in background
        unsubBackground = messaging().onNotificationOpenedApp((remoteMessage) => {
          const { partyId, type } = remoteMessage.data ?? {};

          if (partyId) {
            if (type === 'nomination') {
              router.push({
                pathname: '/party/success',
                params: { partyId: partyId as string },
              });
            } else {
              router.push(`/party/${partyId}`);
            }
          }
        });

        // Handle notification tap when app was killed
        const initialMessage = await messaging().getInitialNotification();
        if (initialMessage?.data?.partyId) {
          const { partyId, type } = initialMessage.data;
          if (type === 'nomination') {
            router.push({
              pathname: '/party/success',
              params: { partyId: partyId as string },
            });
          } else {
            router.push(`/party/${partyId}`);
          }
        }
      } catch (err) {
        console.warn('Push notifications setup failed (Firebase may not be configured):', err);
      }
    };

    setup();

    return () => {
      unsubTokenRefresh?.();
      unsubForeground?.();
      unsubBackground?.();
    };
  }, []);
}
