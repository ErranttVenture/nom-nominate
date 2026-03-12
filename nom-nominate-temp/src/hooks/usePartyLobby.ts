import { useEffect, useState } from 'react';
import { PartyService } from '@/lib/services';
import type { Party, PartyMember } from '@/types';

/**
 * Real-time subscription to a Party lobby — party data and member list.
 */
export function usePartyLobby(partyId: string) {
  const [party, setParty] = useState<Party | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!partyId) return;

    const unsubParty = PartyService.onPartySnapshot(partyId, (p) => {
      setParty(p);
      setLoading(false);
    });

    const unsubMembers = PartyService.onMembersSnapshot(partyId, (m) => {
      setMembers(m);
    });

    return () => {
      unsubParty();
      unsubMembers();
    };
  }, [partyId]);

  return { party, members, loading };
}
