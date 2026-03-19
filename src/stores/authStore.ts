import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** When true, suppress auto-navigation from onAuthStateChanged.
   *  Set during phone verification to prevent race conditions with
   *  Android auto-verification. */
  isVerifying: boolean;
  /** Party ID from a deep link that arrived before the user was
   *  authenticated. After auth completes, the app navigates here. */
  pendingPartyId: string | null;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setVerifying: (verifying: boolean) => void;
  setPendingPartyId: (id: string | null) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isVerifying: false,
  pendingPartyId: null,

  setUser: (user) =>
    set({ user, isAuthenticated: !!user, isLoading: false }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setVerifying: (isVerifying) =>
    set({ isVerifying }),

  setPendingPartyId: (pendingPartyId) =>
    set({ pendingPartyId }),

  signOut: () =>
    set({ user: null, isAuthenticated: false }),
}));
