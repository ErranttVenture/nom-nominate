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
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setVerifying: (verifying: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isVerifying: false,

  setUser: (user) =>
    set({ user, isAuthenticated: !!user, isLoading: false }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setVerifying: (isVerifying) =>
    set({ isVerifying }),

  signOut: () =>
    set({ user: null, isAuthenticated: false }),
}));
