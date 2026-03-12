import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import messaging from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';
import { saveFCMToken } from '@/lib/firebase/auth';

/**
 * Set up push notification handling.
 * - Request permission
 * - Handle foreground notifications
 * - Handle background tap-to-open notifications
 */
export function usePushNotifications() {
  const router = useRouter();

  useEffect(() => {
    // Request permission (iOS)
    const requestPermission = async () => {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.log('Push notification permission denied');
        }
      }
    };

    requestPermission();

    // Handle token refresh
    const unsubTokenRefresh = messaging().onTokenRefresh(async (token) => {
      await saveFCMToken(token);
    });

    // Handle foreground notifications
    const unsubForeground = messaging().onMessage(async (remoteMessage) => {
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
    const unsubBackground = messaging().onNotificationOpenedApp((remoteMessage) => {
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
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage?.data?.partyId) {
          const { partyId, type } = remoteMessage.data;
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

    return () => {
      unsubTokenRefresh();
      unsubForeground();
      unsubBackground();
    };
  }, []);
}
