import { create } from 'zustand';
import type { Party, PartyMember, Venue, VenueVotes } from '@/types';

interface PartyState {
  // Current active party
  currentParty: Party | null;
  members: PartyMember[];
  venues: Venue[];
  currentVenueIndex: number;
  swipeCount: number;
  results: VenueVotes[];

  // Party list
  activeParties: Party[];
  pastParties: Party[];

  // Actions
  setCurrentParty: (party: Party | null) => void;
  setMembers: (members: PartyMember[]) => void;
  setVenues: (venues: Venue[]) => void;
  nextVenue: () => void;
  incrementSwipeCount: () => void;
  setResults: (results: VenueVotes[]) => void;
  setActiveParties: (parties: Party[]) => void;
  setPastParties: (parties: Party[]) => void;
  reset: () => void;
}

export const usePartyStore = create<PartyState>((set) => ({
  currentParty: null,
  members: [],
  venues: [],
  currentVenueIndex: 0,
  swipeCount: 0,
  results: [],
  activeParties: [],
  pastParties: [],

  setCurrentParty: (currentParty) => set({ currentParty }),
  setMembers: (members) => set({ members }),
  setVenues: (venues) => set({ venues }),
  nextVenue: () => set((state) => ({ currentVenueIndex: state.currentVenueIndex + 1 })),
  incrementSwipeCount: () => set((state) => ({ swipeCount: state.swipeCount + 1 })),
  setResults: (results) => set({ results }),
  setActiveParties: (activeParties) => set({ activeParties }),
  setPastParties: (pastParties) => set({ pastParties }),
  reset: () => set({ currentParty: null, members: [], venues: [], currentVenueIndex: 0, swipeCount: 0, results: [] }),
}));
