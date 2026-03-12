import { useEffect, useState } from 'react';
import { usePartyStore } from '@/stores/partyStore';
import { PartyService, SwipeService } from '@/lib/services';
import type { PartyStatus } from '@/types';

/**
 * Manages the swipe session — loads venues, tracks party status changes,
 * and filters out already-swiped venues.
 */
export function useSwipeSession(partyId: string) {
  const [loading, setLoading] = useState(true);
  const [partyStatus, setPartyStatus] = useState<PartyStatus>('swiping');
  const [nominatedVenueId, setNominatedVenueId] = useState<string | undefined>();

  const setCurrentParty = usePartyStore((s) => s.setCurrentParty);
  const setVenues = usePartyStore((s) => s.setVenues);

  useEffect(() => {
    if (!partyId) return;

    let isMounted = true;

    const initSession = async () => {
      try {
        const allVenues = await PartyService.getPartyVenues(partyId);
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
