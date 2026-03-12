import { useEffect, useState } from 'react';
import { PartyService, SwipeService } from '@/lib/services';
import type { Party, VenueVotes } from '@/types';

/**
 * Fetch vote results for a Party.
 */
export function useResults(partyId: string) {
  const [results, setResults] = useState<VenueVotes[]>([]);
  const [party, setParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!partyId) return;

    const fetchResults = async () => {
      try {
        const [partyData, voteResults] = await Promise.all([
          PartyService.getParty(partyId),
          SwipeService.getVoteResults(partyId),
        ]);
        setParty(partyData);
        setResults(voteResults);
      } catch (error) {
        console.error('Failed to fetch results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [partyId]);

  return { results, party, loading };
}
