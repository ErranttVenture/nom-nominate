import { useEffect, useState } from 'react';
import { usePartyStore } from '@/stores/partyStore';
import { PartyService, SwipeService, PlacesService } from '@/lib/services';
import type { PartyStatus } from '@/types';

/**
 * Manages the swipe session — loads venues, tracks party status changes,
 * and filters out already-swiped venues.
 *
 * If no cached venues exist in Firestore (e.g. party created before Places
 * API was wired up), it re-fetches from the Places API and caches them.
 */
export function useSwipeSession(partyId: string) {
  const [loading, setLoading] = useState(true);
  const [partyStatus, setPartyStatus] = useState<PartyStatus>('swiping');
  const [nominatedVenueId, setNominatedVenueId] = useState<string | undefined>();

  const setCurrentParty = usePartyStore((s) => s.setCurrentParty);
  const setVenues = usePartyStore((s) => s.setVenues);
  const reset = usePartyStore((s) => s.reset);

  useEffect(() => {
    if (!partyId) return;

    let isMounted = true;

    // Reset store state for fresh session
    reset();

    const initSession = async () => {
      try {
        let allVenues = await PartyService.getPartyVenues(partyId);

        // If no venues cached, try fetching fresh from Places API
        if (allVenues.length === 0) {
          console.log('No cached venues found, fetching from Places API...');
          try {
            // Re-run startSwipingSession to fetch & cache venues
            await PartyService.startSwipingSession(partyId);
            // Re-read the now-cached venues
            allVenues = await PartyService.getPartyVenues(partyId);
          } catch (err) {
            console.error('Failed to fetch venues from Places API:', err);
          }
        }

        const swipedIds = await SwipeService.getUserSwipedVenueIds(partyId);
        const unswiped = allVenues.filter((v) => !swipedIds.has(v.id));

        if (isMounted) {
          setVenues(unswiped);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to init swipe session:', error);
        if (isMounted) setLoading(false);
      }
    };

    initSession();

    // Subscribe to party status changes
    const unsubParty = PartyService.onPartySnapshot(partyId, (party) => {
      if (isMounted) {
        setCurrentParty(party);
        setPartyStatus(party.status);
        setNominatedVenueId(party.nominatedVenueId);
      }
    });

    return () => {
      isMounted = false;
      unsubParty();
    };
  }, [partyId]);

  return { loading, partyStatus, nominatedVenueId };
}
