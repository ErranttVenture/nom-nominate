import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ExpoInAppUpdates from 'expo-in-app-updates';

/**
 * Checks for a Play Store update on Android app launch.
 * Uses immediate update mode — full-screen blocking overlay,
 * user must update before continuing.
 *
 * Only works when installed from Google Play (not sideloaded APKs or emulators).
 */
export function useInAppUpdate() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    async function checkUpdate() {
      try {
        const result = await ExpoInAppUpdates.checkForUpdate();
        if (result.updateAvailable) {
          // Immediate update: full-screen blocking, user must update
          await ExpoInAppUpdates.startUpdate(true);
        }
      } catch (error) {
        // Silently fail — don't block user if update check fails
        console.warn('[InAppUpdate] Check failed:', error);
      }
    }

    checkUpdate();
  }, []);
}
