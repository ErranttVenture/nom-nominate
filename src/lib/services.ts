/**
 * Service abstraction layer.
 *
 * USE_MOCK = false → real Firebase backend for multiplayer.
 * Set USE_MOCK = true for local development with in-memory mock data.
 */

import type { Party, PartyMember, Venue, VenueVotes } from '@/types';

export const USE_MOCK = false;

// Firebase imports (real backend)
import * as firebaseAuth from '@/lib/firebase/auth';
import * as firebaseParties from '@/lib/firebase/parties';
import * as firebaseSwipes from '@/lib/firebase/swipes';
import { geocodeZipCode as realGeocodeZipCode } from '@/lib/api/geocoding';

// ===== AUTH SERVICE =====

export const AuthService = {
  signInWithPhone: async (phone: string) => {
    return firebaseAuth.signInWithPhone(phone);
  },

  confirmVerificationCode: async (confirmation: any, code: string) => {
    return firebaseAuth.confirmVerificationCode(confirmation, code);
  },

  updateUserProfile: async (displayName: string) => {
    return firebaseAuth.updateUserProfile(displayName);
  },

  signOut: async () => {
    return firebaseAuth.signOutUser();
  },
};

// ===== PARTY SERVICE =====

export const PartyService = {
  createParty: async (input: {
    name: string;
    zipCode: string;
    radiusMiles: 5 | 10 | 15 | 25;
    date?: string;
    creatorId: string;
  }): Promise<string> => {
    return firebaseParties.createParty(input);
  },

  joinParty: async (partyId: string) => {
    return firebaseParties.joinParty(partyId);
  },

  getParty: async (partyId: string): Promise<Party | null> => {
    return firebaseParties.getParty(partyId);
  },

  getUserParties: async (): Promise<{ active: Party[]; past: Party[] }> => {
    return firebaseParties.getUserParties();
  },

  getPartyMembers: async (partyId: string): Promise<PartyMember[]> => {
    return firebaseParties.getPartyMembers(partyId);
  },

  getPartyVenues: async (partyId: string): Promise<Venue[]> => {
    return firebaseParties.getPartyVenues(partyId);
  },

  startSwipingSession: async (partyId: string) => {
    return firebaseParties.startSwipingSession(partyId);
  },

  onPartySnapshot: (partyId: string, callback: (party: Party) => void) => {
    return firebaseParties.onPartySnapshot(partyId, (party) => {
      if (party) callback(party);
    });
  },

  onMembersSnapshot: (partyId: string, callback: (members: PartyMember[]) => void) => {
    return firebaseParties.onMembersSnapshot(partyId, callback);
  },

  updatePartyRadius: async (partyId: string, newRadius: 5 | 10 | 15 | 25): Promise<Venue[]> => {
    return firebaseParties.updatePartyRadius(partyId, newRadius);
  },
};

// ===== SWIPE SERVICE =====

export const SwipeService = {
  recordSwipe: async (input: {
    partyId: string;
    venueId: string;
    direction: 'left' | 'right';
  }) => {
    return firebaseSwipes.recordSwipe(input);
  },

  getUserSwipedVenueIds: async (partyId: string): Promise<Set<string>> => {
    return firebaseSwipes.getUserSwipedVenueIds(partyId);
  },

  getVoteResults: async (partyId: string): Promise<VenueVotes[]> => {
    return firebaseSwipes.getVoteResults(partyId);
  },
};

// ===== GEOCODING SERVICE =====

export const GeoService = {
  geocodeZipCode: async (zipCode: string): Promise<{ lat: number; lng: number }> => {
    return realGeocodeZipCode(zipCode);
  },
};
