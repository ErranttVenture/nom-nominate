import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useAuthStore } from '@/stores/authStore';
import { PartyService } from '@/lib/services';
import { Alert } from 'react-native';

/**
 * Handle deep links for party invitations.
 * Supported formats:
 *   - nomnominate://party/{partyId}        (custom scheme)
 *   - https://nom-nominate.web.app/party/{partyId}  (universal link)
 */

// Store pending party ID globally so it survives re-renders
let pendingPartyId: string | null = null;

export function useDeepLink() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHandledPending = useRef(false);

  useEffect(() => {
    const extractPartyId = (url: string): string | null => {
      // Try parsing with Linking first (handles custom scheme)
      const parsed = Linking.parse(url);
      if (parsed.path?.startsWith('party/')) {
        return parsed.path.replace('party/', '').split('?')[0] || null;
      }

      // Also handle raw web URLs: https://nom-nominate.web.app/party/abc123
      try {
        const urlObj = new URL(url);
        const match = urlObj.pathname.match(/\/party\/([^/?]+)/);
        if (match) return match[1];
      } catch {
        // Not a valid URL
      }

      // Handle query param format: /party?id=abc123
      try {
        const urlObj = new URL(url);
        const id = urlObj.searchParams.get('id');
        if (urlObj.pathname.includes('/party') && id) return id;
      } catch {
        // Not a valid URL
      }

      return null;
    };

    const joinAndNavigate = async (partyId: string) => {
      try {
        await PartyService.joinParty(partyId);
        router.push(`/party/${partyId}`);
      } catch (error: any) {
        console.error('Failed to join party:', error);
        Alert.alert(
          'Could not join party',
          error.message || 'The party may no longer exist. Please ask the host for a new link.'
        );
      }
    };

    const handleUrl = async (event: { url: string }) => {
      const partyId = extractPartyId(event.url);
      if (!partyId) return;

      if (!isAuthenticated) {
        // Store the party ID to join after authentication
        pendingPartyId = partyId;
        router.push('/auth');
        return;
      }

      await joinAndNavigate(partyId);
    };

    // If user just authenticated and there's a pending party, join it now
    if (isAuthenticated && pendingPartyId && !hasHandledPending.current) {
      hasHandledPending.current = true;
      const partyId = pendingPartyId;
      pendingPartyId = null;
      joinAndNavigate(partyId);
    }

    // Handle URL when app is opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    // Handle URL when app is already open
    const subscription = Linking.addEventListener('url', handleUrl);

    return () => subscription.remove();
  }, [isAuthenticated]);
}
