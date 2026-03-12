import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuthStore } from '@/stores/authStore';
import { PartyService } from '@/lib/services';

/**
 * Handle deep links for party invitations.
 * URLs: nomnominate://party/{partyId} or https://nomnominate.app/party/{partyId}
 */
export function useDeepLink() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const handleUrl = async (event: { url: string }) => {
      const { url } = event;
      const parsed = Linking.parse(url);

      // Extract partyId from path like /party/abc123
      if (parsed.path?.startsWith('party/')) {
        const partyId = parsed.path.replace('party/', '');

        if (!partyId) return;

        if (!isAuthenticated) {
          // Store intended destination and redirect to auth
          // After auth, user will be redirected to the party
          router.push('/auth');
          return;
        }

        try {
          await PartyService.joinParty(partyId);
          router.push(`/party/${partyId}`);
        } catch (error) {
          console.error('Failed to join party:', error);
        }
      }
    };

    // Handle URL when app is opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    // Handle URL when app is already open
    const subscription = Linking.addEventListener('url', handleUrl);

    return () => subscription.remove();
  }, [isAuthenticated]);
}
