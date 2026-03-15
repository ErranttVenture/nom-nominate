import { useEffect, useState, useRef } from 'react';
import { PartyService } from '@/lib/services';
import type { Party, PartyMember } from '@/types';

const LOBBY_TIMEOUT_MS = 5000;

/**
 * Real-time subscription to a Party lobby — party data and member list.
 */
export function usePartyLobby(partyId: string) {
  const [party, setParty] = useState<Party | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const receivedData = useRef(false);

  useEffect(() => {
    if (!partyId) return;

    receivedData.current = false;

    const unsubParty = PartyService.onPartySnapshot(partyId, (p) => {
      if (p) {
        receivedData.current = true;
        setParty(p);
        setError(null);
      } else {
        // Party not found
        setError('Party not found');
      }
      setLoading(false);
    });

    const unsubMembers = PartyService.onMembersSnapshot(partyId, (m) => {
      setMembers(m);
    });

    // Timeout: if we never receive data, surface an error
    const timeout = setTimeout(() => {
      if (!receivedData.current) {
        setError('Could not load party. Please check your connection and try again.');
        setLoading(false);
      }
    }, LOBBY_TIMEOUT_MS);

    return () => {
      unsubParty();
      unsubMembers();
      clearTimeout(timeout);
    };
  }, [partyId]);

  return { party, members, loading, error };
}
