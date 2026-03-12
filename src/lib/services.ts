/**
 * Service abstraction layer.
 *
 * Currently wired to mock data for local development.
 * When ready to connect Firebase, replace the mock imports with real
 * Firebase service calls — no other files need to change.
 */

import type { Party, PartyMember, Venue, VenueVotes } from '@/types';
import {
  mockAuth,
  mockParties$,
  mockSwipes,
  mockGeocoding,
} from '@/lib/mock/services';

export const USE_MOCK = true;

// ===== AUTH SERVICE =====

export const AuthService = {
  signInWithPhone: async (phone: string) => {
    return mockAuth.signInWithPhone(phone);
  },

  confirmVerificationCode: async (confirmation: any, code: string) => {
    return mockAuth.confirmVerificationCode(confirmation, code);
  },

  updateUserProfile: async (displayName: string) => {
    return mockAuth.updateUserProfile(displayName);
  },

  signOut: async () => {
    return mockAuth.signOut();
  },
};

// ===== PARTY SERVICE =====

export const PartyService = {
  createParty: async (input: {
    name: string;
    zipCode: string;
    radiusMiles: number;
    date?: string;
    creatorId: string;
  }): Promise<string> => {
    return mockParties$.createParty(input);
  },

  joinParty: async (partyId: string) => {
    return mockParties$.joinParty(partyId);
  },

  getParty: async (partyId: string): Promise<Party | null> => {
    return mockParties$.getParty(partyId);
  },

  getUserParties: async (): Promise<{ active: Party[]; past: Party[] }> => {
    return mockParties$.getUserParties();
  },

  getPartyMembers: async (partyId: string): Promise<PartyMember[]> => {
    return mockParties$.getPartyMembers(partyId);
  },

  getPartyVenues: async (partyId: string): Promise<Venue[]> => {
    return mockParties$.getPartyVenues(partyId);
  },

  startSwipingSession: async (partyId: string) => {
    return mockParties$.startSwipingSession(partyId);
  },

  onPartySnapshot: (partyId: string, callback: (party: Party) => void) => {
    return mockParties$.onPartySnapshot(partyId, callback);
  },

  onMembersSnapshot: (partyId: string, callback: (members: PartyMember[]) => void) => {
    return mockParties$.onMembersSnapshot(partyId, callback);
  },
};

// ===== SWIPE SERVICE =====

export const SwipeService = {
  recordSwipe: async (input: {
    partyId: string;
    venueId: string;
    direction: 'left' | 'right';
  }) => {
    return mockSwipes.recordSwipe(input);
  },

  getUserSwipedVenueIds: async (partyId: string): Promise<Set<string>> => {
    return mockSwipes.getUserSwipedVenueIds(partyId);
  },

  getVoteResults: async (partyId: string): Promise<VenueVotes[]> => {
    return mockSwipes.getVoteResults(partyId);
  },
};

// ===== GEOCODING SERVICE =====

export const GeoService = {
  geocodeZipCode: async (zipCode: string): Promise<{ lat: number; lng: number }> => {
    return mockGeocoding.geocodeZipCode(zipCode);
  },
};
