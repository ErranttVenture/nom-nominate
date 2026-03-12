import { useEffect, useState } from 'react';
import { PartyService } from '@/lib/services';
import { MOCK_VENUES } from '@/lib/mock/data';
import type { Party, Venue } from '@/types';

/**
 * Fetch the nominated venue and party details for the success screen.
 */
export function useNominatedVenue(partyId: string, venueId: string) {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [party, setParty] = useState<Party | null>(null);

  useEffect(() => {
    if (!partyId) return;

    const fetchData = async () => {
      const partyData = await PartyService.getParty(partyId);
      if (partyData) setParty(partyData);

      if (venueId) {
        const v = MOCK_VENUES.find((mv) => mv.id === venueId);
        if (v) setVenue(v);
      }
    };

    fetchData();
  }, [partyId, venueId]);

  return { venue, party };
}
