/**
 * Mock service layer — drop-in replacement for Firebase + Google APIs.
 * Every function matches the signature of the real service so switching
 * to production is just changing the import path.
 */

import {
  MOCK_USER,
  MOCK_MEMBERS,
  MOCK_ACTIVE_PARTIES,
  MOCK_PAST_PARTIES,
  MOCK_VENUES,
  MOCK_RESULTS,
} from './data';
import type { Party, PartyMember, Venue, VenueVotes } from '@/types';

// In-memory state for the mock session
let mockParties = [...MOCK_ACTIVE_PARTIES];
let mockPastParties = [...MOCK_PAST_PARTIES];
let mockCurrentPartyId: string | null = null;
let mockSwipedVenueIds = new Set<string>();
let mockSwipeCount = 0;
let mockRightSwipeCounts: Record<string, number> = {};
let mockNominatedVenueId: string | undefined = undefined;
let mockPartyStatus: Party['status'] = 'lobby';
let nextPartyNumber = 2;

// Listeners for real-time simulation
type Listener<T> = (data: T) => void;
let partyListeners: Listener<Party>[] = [];
let memberListeners: Listener<PartyMember[]>[] = [];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ===== AUTH =====

export const mockAuth = {
  getCurrentUser: () => MOCK_USER,

  signInWithPhone: async (_phone: string) => {
    await delay(800);
    return { confirmationResult: 'mock_confirmation' };
  },

  confirmVerificationCode: async (_confirmation: any, _code: string) => {
    await delay(600);
    return { isNewUser: false };
  },

  updateUserProfile: async (displayName: string) => {
    await delay(300);
    MOCK_USER.displayName = displayName;
  },

  signOut: async () => {
    await delay(200);
  },
};

// ===== PARTIES =====

export const mockParties$ = {
  createParty: async (input: {
    name: string;
    zipCode: string;
    radiusMiles: number;
    date?: string;
    creatorId: string;
  }): Promise<string> => {
    await delay(500);

    const id = `party_${nextPartyNumber++}`;
    const newParty: Party = {
      id,
      name: input.name,
      zipCode: input.zipCode,
      centerLat: 34.0901,
      centerLng: -118.4065,
      radiusMiles: input.radiusMiles as 5 | 10 | 15 | 25,
      date: input.date,
      creatorId: input.creatorId,
      memberIds: [input.creatorId],
      status: 'lobby',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockParties.push(newParty);
    mockCurrentPartyId = id;
    mockPartyStatus = 'lobby';
    return id;
  },

  joinParty: async (_partyId: string) => {
    await delay(300);
  },

  getParty: async (partyId: string): Promise<Party | null> => {
    const all = [...mockParties, ...mockPastParties];
    return all.find((p) => p.id === partyId) ?? null;
  },

  getUserParties: async () => {
    await delay(400);
    return {
      active: mockParties,
      past: mockPastParties,
    };
  },

  getPartyMembers: async (_partyId: string): Promise<PartyMember[]> => {
    return [...MOCK_MEMBERS];
  },

  getPartyVenues: async (_partyId: string): Promise<Venue[]> => {
    return MOCK_VENUES.sort((a, b) => b.priorityScore - a.priorityScore);
  },

  startSwipingSession: async (partyId: string) => {
    await delay(700);
    mockPartyStatus = 'swiping';
    mockSwipedVenueIds.clear();
    mockSwipeCount = 0;
    mockRightSwipeCounts = {};
    mockNominatedVenueId = undefined;

    const party = mockParties.find((p) => p.id === partyId);
    if (party) {
      party.status = 'swiping';
      notifyPartyListeners(party);
    }
  },

  // Real-time simulation: subscribe to party changes
  onPartySnapshot: (partyId: string, callback: Listener<Party>) => {
    partyListeners.push(callback);
    // Immediately fire with current data
    const all = [...mockParties, ...mockPastParties];
    const party = all.find((p) => p.id === partyId);
    if (party) callback(party);

    return () => {
      partyListeners = partyListeners.filter((l) => l !== callback);
    };
  },

  onMembersSnapshot: (_partyId: string, callback: Listener<PartyMember[]>) => {
    memberListeners.push(callback);
    callback([...MOCK_MEMBERS]);
    return () => {
      memberListeners = memberListeners.filter((l) => l !== callback);
    };
  },
};

// ===== SWIPES =====

export const mockSwipes = {
  recordSwipe: async (input: {
    partyId: string;
    venueId: string;
    direction: 'left' | 'right';
  }) => {
    await delay(150);
    mockSwipedVenueIds.add(input.venueId);
    mockSwipeCount++;

    if (input.direction === 'right') {
      mockRightSwipeCounts[input.venueId] =
        (mockRightSwipeCounts[input.venueId] ?? 0) + 1;

      // Simulate other party members also right-swiping
      // After 3 right-swipes on the same venue, trigger nomination
      const venue = MOCK_VENUES.find((v) => v.id === input.venueId);
      if (venue) {
        venue.priorityScore += 1;
      }
    }
  },

  getUserSwipedVenueIds: async (_partyId: string): Promise<Set<string>> => {
    return new Set(mockSwipedVenueIds);
  },

  getVoteResults: async (_partyId: string): Promise<VenueVotes[]> => {
    await delay(300);
    return [...MOCK_RESULTS];
  },

  getSwipeCount: () => mockSwipeCount,
};

// ===== NOMINATION SIMULATION =====

/**
 * Call this to simulate a nomination event.
 * In the real app, Cloud Functions handle this.
 */
export function simulateNomination(partyId: string, venueId: string) {
  mockNominatedVenueId = venueId;
  mockPartyStatus = 'nominated';

  const party = mockParties.find((p) => p.id === partyId);
  if (party) {
    party.status = 'nominated';
    party.nominatedVenueId = venueId;
    notifyPartyListeners(party);
  }
}

export function getMockPartyStatus() {
  return mockPartyStatus;
}

export function getMockNominatedVenueId() {
  return mockNominatedVenueId;
}

// ===== GEOCODING =====

export const mockGeocoding = {
  geocodeZipCode: async (zipCode: string) => {
    await delay(300);
    // Return approximate coordinates for common zip codes
    const known: Record<string, { lat: number; lng: number }> = {
      '90210': { lat: 34.0901, lng: -118.4065 },
      '10001': { lat: 40.7484, lng: -73.9967 },
      '60601': { lat: 41.8819, lng: -87.6278 },
      '94102': { lat: 37.7749, lng: -122.4194 },
    };
    return known[zipCode] ?? { lat: 34.0522, lng: -118.2437 }; // default LA
  },
};

// ===== HELPERS =====

function notifyPartyListeners(party: Party) {
  partyListeners.forEach((l) => l(party));
}

/**
 * Reset all mock state (useful for testing).
 */
export function resetMockState() {
  mockParties = [...MOCK_ACTIVE_PARTIES];
  mockPastParties = [...MOCK_PAST_PARTIES];
  mockCurrentPartyId = null;
  mockSwipedVenueIds.clear();
  mockSwipeCount = 0;
  mockRightSwipeCounts = {};
  mockNominatedVenueId = undefined;
  mockPartyStatus = 'lobby';
  partyListeners = [];
  memberListeners = [];
}
