import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { usePartyStore } from '@/stores/partyStore';
import { PartyService } from '@/lib/services';

/**
 * Fetch and subscribe to the current user's parties.
 */
export function useParties() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setActiveParties = usePartyStore((s) => s.setActiveParties);
  const setPastParties = usePartyStore((s) => s.setPastParties);
  const [loading, setLoading] = useState(false);

  const fetchParties = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const { active, past } = await PartyService.getUserParties();
      setActiveParties(active);
      setPastParties(past);
    } catch (error) {
      console.error('Failed to fetch parties:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  return { loading, refresh: fetchParties };
}
