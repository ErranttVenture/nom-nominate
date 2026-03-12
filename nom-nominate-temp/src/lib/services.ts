/**
 * Service abstraction layer.
 *
 * USE_MOCK=true  → all calls hit in-memory mock data (no Firebase, no APIs)
 * USE_MOCK=false → all calls hit real Firebase + Google APIs
 *
 * Flip USE_MOCK to false when you're ready to go live.
 */

import type { Party, PartyMember, Venue, VenueVotes } from '@/types';
import {
  mockAuth,
  mockParties$,
  mockSwipes,
  mockGeocoding,
} from '@/lib/mock/services';
import * as firebaseAuth from '@/lib/firebase/auth';
import * as firebaseParties from '@/lib/firebase/parties';
import * as firebaseSwipes from '@/lib/firebase/swipes';
import * as firebasePlaces from '@/lib/firebase/places';

// ─── Toggle these to switch between mock and production ──
export const USE_MOCK_AUTH = true;   // Keep true until Firebase Phone Auth + reCAPTCHA is wired
export const USE_MOCK_DATA = false;  // false = real Firestore + Google Places
// ──────────────────────────────────────────────────────────
// Legacy alias — some code may still reference this
export const USE_MOCK = USE_MOCK_AUTH && USE_MOCK_DATA;

// ===== AUTH SERVICE =====

export const AuthService = {
  signInWithPhone: async (phone: string) => {
    if (USE_MOCK_AUTH) return mockAuth.signInWithPhone(phone);
    return firebaseAuth.signInWithPhone(phone);
  },

  confirmVerificationCode: async (confirmation: any, code: string) => {
    if (USE_MOCK_AUTH) return mockAuth.confirmVerificationCode(confirmation, code);
    return firebaseAuth.confirmVerificationCode(confirmation, code);
  },

  updateUserProfile: async (displayName: string) => {
    if (USE_MOCK_AUTH) return mockAuth.updateUserProfile(displayName);
    return firebaseAuth.updateUserProfile(displayName);
  },

  signOut: async () => {
    if (USE_MOCK_AUTH) return mockAuth.signOut();
    return firebaseAuth.signOutUser();
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
    if (USE_MOCK_DATA) return mockParties$.createParty(input);
    return firebaseParties.createParty(input);
  },

  joinParty: async (partyId: string) => {
    if (USE_MOCK_DATA) return mockParties$.joinParty(partyId);
    return firebaseParties.joinParty(partyId);
  },

  getParty: async (partyId: string): Promise<Party | null> => {
    if (USE_MOCK_DATA) return mockParties$.getParty(partyId);
    return firebaseParties.getParty(partyId);
  },

  getUserParties: async (): Promise<{ active: Party[]; past: Party[] }> => {
    if (USE_MOCK_DATA) return mockParties$.getUserParties();
    return firebaseParties.getUserParties();
  },

  getPartyMembers: async (partyId: string): Promise<PartyMember[]> => {
    if (USE_MOCK_DATA) return mockParties$.getPartyMembers(partyId);
    return firebaseParties.getPartyMembers(partyId);
  },

  getPartyVenues: async (partyId: string): Promise<Venue[]> => {
    if (USE_MOCK_DATA) return mockParties$.getPartyVenues(partyId);
    return firebaseParties.getPartyVenues(partyId);
  },

  startSwipingSession: async (partyId: string) => {
    if (USE_MOCK_DATA) return mockParties$.startSwipingSession(partyId);
    return firebaseParties.startSwipingSession(partyId);
  },

  onPartySnapshot: (partyId: string, callback: (party: Party) => void) => {
    if (USE_MOCK_DATA) return mockParties$.onPartySnapshot(partyId, callback);
    return firebaseParties.onPartySnapshot(partyId, callback);
  },

  onMembersSnapshot: (partyId: string, callback: (members: PartyMember[]) => void) => {
    if (USE_MOCK_DATA) return mockParties$.onMembersSnapshot(partyId, callback);
    return firebaseParties.onMembersSnapshot(partyId, callback);
  },
};

// ===== SWIPE SERVICE =====

export const SwipeService = {
  recordSwipe: async (input: {
    partyId: string;
    venueId: string;
    direction: 'left' | 'right';
  }) => {
    if (USE_MOCK_DATA) return mockSwipes.recordSwipe(input);
    return firebaseSwipes.recordSwipe(input);
  },

  getUserSwipedVenueIds: async (partyId: string): Promise<Set<string>> => {
    if (USE_MOCK_DATA) return mockSwipes.getUserSwipedVenueIds(partyId);
    return firebaseSwipes.getUserSwipedVenueIds(partyId);
  },

  getVoteResults: async (partyId: string): Promise<VenueVotes[]> => {
    if (USE_MOCK_DATA) return mockSwipes.getVoteResults(partyId);
    return firebaseSwipes.getVoteResults(partyId);
  },
};

// ===== GEOCODING SERVICE =====

export const GeoService = {
  geocodeZipCode: async (zipCode: string): Promise<{ lat: number; lng: number }> => {
    if (USE_MOCK_DATA) return mockGeocoding.geocodeZipCode(zipCode);
    return firebasePlaces.geocodeZipCode(zipCode);
  },
};

// ===== PLACES / VENUE SEARCH SERVICE =====

export const PlacesService = {
  searchNearbyRestaurants: async (options: {
    lat: number;
    lng: number;
    radiusMiles: number;
    maxResults?: number;
  }): Promise<Venue[]> => {
    if (USE_MOCK_DATA) return mockParties$.getPartyVenues('mock');
    return firebasePlaces.searchNearbyRestaurants(options);
  },
};
