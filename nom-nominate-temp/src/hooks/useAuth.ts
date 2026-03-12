import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { MOCK_USER } from '@/lib/mock/data';

/**
 * Listen to auth state changes and sync with Zustand store.
 * In mock mode (current), immediately sets the mock user.
 * Swap this implementation when connecting Firebase.
 */
export function useAuthListener() {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    // Mock mode: auto-authenticate immediately
    setUser(MOCK_USER);
  }, []);
}
