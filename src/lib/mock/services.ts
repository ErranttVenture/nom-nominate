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

// ===== VENUE TEMPLATES FOR GENERATING LOCATION-AWARE VENUES =====

const VENUE_TEMPLATES = [
  { name: 'The Golden Fork', cuisine: 'Mediterranean', rating: 4.6, priceLevel: 2, photo: 'https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?w=600&h=400&fit=crop' },
  { name: 'Sunrise Café', cuisine: 'Brunch & Bakery', rating: 4.4, priceLevel: 1, photo: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop' },
  { name: 'Bamboo Garden', cuisine: 'Asian Fusion', rating: 4.3, priceLevel: 2, photo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop' },
  { name: 'Taco Libre', cuisine: 'Mexican Street Food', rating: 4.5, priceLevel: 1, photo: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&h=400&fit=crop' },
  { name: 'Chez Laurent', cuisine: 'French Fine Dining', rating: 4.8, priceLevel: 4, photo: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop' },
  { name: 'The Burger Joint', cuisine: 'American Grill', rating: 4.2, priceLevel: 1, photo: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop' },
  { name: 'Pasta Palace', cuisine: 'Italian', rating: 4.7, priceLevel: 3, photo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=400&fit=crop' },
  { name: 'Sushi Roku', cuisine: 'Japanese', rating: 4.5, priceLevel: 3, photo: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&h=400&fit=crop' },
  { name: 'Curry House', cuisine: 'Indian', rating: 4.4, priceLevel: 2, photo: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&h=400&fit=crop' },
  { name: 'El Torito Cantina', cuisine: 'Mexican', rating: 4.1, priceLevel: 2, photo: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600&h=400&fit=crop' },
  { name: 'Pho King Good', cuisine: 'Vietnamese', rating: 4.6, priceLevel: 1, photo: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&h=400&fit=crop' },
  { name: 'The Rustic Table', cuisine: 'Farm-to-Table American', rating: 4.5, priceLevel: 3, photo: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=600&h=400&fit=crop' },
  { name: 'Barrel & Vine', cuisine: 'Wine Bar & Small Plates', rating: 4.3, priceLevel: 3, photo: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&h=400&fit=crop' },
  { name: 'Seoul Kitchen', cuisine: 'Korean BBQ', rating: 4.4, priceLevel: 2, photo: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&h=400&fit=crop' },
  { name: 'Pizza Antica', cuisine: 'Neapolitan Pizza', rating: 4.6, priceLevel: 2, photo: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600&h=400&fit=crop' },
  { name: 'Catch LA', cuisine: 'Seafood', rating: 4.2, priceLevel: 4, photo: 'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=600&h=400&fit=crop' },
  { name: 'Gracias Madre', cuisine: 'Vegan Mexican', rating: 4.3, priceLevel: 2, photo: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop' },
  { name: 'Nobu Malibu', cuisine: 'Japanese Fusion', rating: 4.7, priceLevel: 4, photo: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&h=400&fit=crop' },
  { name: 'Republique', cuisine: 'French Bistro', rating: 4.5, priceLevel: 3, photo: 'https://images.unsplash.com/photo-1550966871-3ed3cdb51f3a?w=600&h=400&fit=crop' },
  { name: 'Jitlada Thai', cuisine: 'Thai', rating: 4.6, priceLevel: 2, photo: 'https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=600&h=400&fit=crop' },
];

// Street name pool for generating addresses
const STREET_NAMES = [
  'Main St', 'Sunset Blvd', 'Oak Ave', 'Park Dr', 'Center St',
  'Broadway', 'Elm St', 'Highland Ave', 'Vine St', 'Market St',
  'First Ave', 'Lake Blvd', 'Pine St', 'River Rd', 'College Ave',
  'Church St', 'Maple Ave', 'Washington Blvd', 'Lincoln Ave', 'Union St',
];

/**
 * Generates a set of mock venues centered around a given lat/lng
 * with randomized offsets to simulate different locations per zip.
 */
function generateVenuesForLocation(
  centerLat: number,
  centerLng: number,
  radiusMiles: number,
  partyId: string,
): (Venue & { priorityScore: number })[] {
  // Use partyId as a simple seed so the same party always gets the same venues
  let seed = 0;
  for (let i = 0; i < partyId.length; i++) {
    seed = ((seed << 5) - seed + partyId.charCodeAt(i)) | 0;
  }
  const seededRandom = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed & 0x7fffffff) / 2147483647;
  };

  // Shuffle the templates using the seeded random
  const shuffled = [...VENUE_TEMPLATES].sort(() => seededRandom() - 0.5);

  return shuffled.map((template, i) => {
    // Generate random offset within radius (rough: 1 degree ~ 69 miles)
    const degreeRange = radiusMiles / 69;
    const latOffset = (seededRandom() - 0.5) * 2 * degreeRange;
    const lngOffset = (seededRandom() - 0.5) * 2 * degreeRange;
    const venueLat = centerLat + latOffset;
    const venueLng = centerLng + lngOffset;

    // Calculate approximate distance
    const dLat = venueLat - centerLat;
    const dLng = venueLng - centerLng;
    const distanceMiles = Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 69 * 10) / 10;

    const streetNum = Math.floor(seededRandom() * 9000) + 100;
    const streetName = STREET_NAMES[i % STREET_NAMES.length];

    const hasOffer = i === 1 || i === 5 || i === 9; // 3 venues get offers
    const offers: Record<number, { id: string; title: string; description: string }> = {
      1: { id: `offer_${partyId}_1`, title: '15% off weekend brunch!', description: 'Show this offer to your server for 15% off your total bill.' },
      5: { id: `offer_${partyId}_2`, title: 'Free fries with any burger!', description: 'Order any burger and get a free side of fries.' },
      9: { id: `offer_${partyId}_3`, title: '$5 margaritas all night!', description: 'House margaritas for just $5 every Friday and Saturday.' },
    };

    return {
      id: `venue_${partyId}_${i + 1}`,
      name: template.name,
      cuisine: template.cuisine,
      rating: template.rating,
      priceLevel: template.priceLevel,
      photoUrl: template.photo,
      lat: venueLat,
      lng: venueLng,
      distanceMiles,
      address: `${streetNum} ${streetName}`,
      isOpenOnDate: true,
      hasOffer,
      ...(hasOffer && offers[i]
        ? {
            offer: {
              id: offers[i].id,
              venueId: `venue_${partyId}_${i + 1}`,
              title: offers[i].title,
              description: offers[i].description,
              validUntil: new Date(Date.now() + 30 * 86400000),
            },
          }
        : {}),
      priorityScore: 0,
    };
  });
}

// In-memory state for the mock session
let mockParties = [...MOCK_ACTIVE_PARTIES];
let mockPastParties = [...MOCK_PAST_PARTIES];
let mockCurrentPartyId: string | null = null;
let mockSwipedVenueIds = new Set<string>();
let mockSwipeCount = 0;
let mockRightSwipeCounts: Record<string, number> = {};
let mockNominatedVenueId: string | undefined = undefined;
let mockPartyStatus: Party['status'] = 'lobby';
let nextPartyNumber = 1;

// Per-party venue cache so each party gets unique venues
let partyVenueCache: Record<string, (Venue & { priorityScore: number })[]> = {};

// Per-party member cache so each party gets its own member list
let partyMemberCache: Record<string, PartyMember[]> = {};

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

    // Geocode the zip code to get coordinates
    const coords = await mockGeocoding.geocodeZipCode(input.zipCode);

    const id = `party_${nextPartyNumber++}`;
    const newParty: Party = {
      id,
      name: input.name,
      zipCode: input.zipCode,
      centerLat: coords.lat,
      centerLng: coords.lng,
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

    // Pre-generate venues for this party based on its location
    partyVenueCache[id] = generateVenuesForLocation(
      coords.lat,
      coords.lng,
      input.radiusMiles,
      id,
    );

    // Create member entry for the creator
    partyMemberCache[id] = [
      {
        userId: input.creatorId,
        displayName: MOCK_USER.displayName,
        joinedAt: new Date(),
        status: 'joined',
        swipeCount: 0,
      },
    ];

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

  getPartyMembers: async (partyId: string): Promise<PartyMember[]> => {
    if (partyMemberCache[partyId]) {
      return [...partyMemberCache[partyId]];
    }
    return [...MOCK_MEMBERS];
  },

  getPartyVenues: async (partyId: string): Promise<Venue[]> => {
    // Return cached venues for this party, or generate from defaults
    if (partyVenueCache[partyId]) {
      return partyVenueCache[partyId];
    }

    // Fallback: look up party coords and generate
    const party = [...mockParties, ...mockPastParties].find((p) => p.id === partyId);
    if (party) {
      partyVenueCache[partyId] = generateVenuesForLocation(
        party.centerLat,
        party.centerLng,
        party.radiusMiles,
        partyId,
      );
      return partyVenueCache[partyId];
    }

    // Ultimate fallback — return default mock venues
    return MOCK_VENUES;
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

  onMembersSnapshot: (partyId: string, callback: Listener<PartyMember[]>) => {
    memberListeners.push(callback);
    const members = partyMemberCache[partyId] ?? [...MOCK_MEMBERS];
    callback(members);
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
      '30301': { lat: 33.7490, lng: -84.3880 },
      '98101': { lat: 47.6062, lng: -122.3321 },
      '33101': { lat: 25.7617, lng: -80.1918 },
      '02101': { lat: 42.3601, lng: -71.0589 },
      '80201': { lat: 39.7392, lng: -104.9903 },
      '78201': { lat: 29.4241, lng: -98.4936 },
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
  mockParties = [];
  mockPastParties = [];
  mockCurrentPartyId = null;
  mockSwipedVenueIds.clear();
  mockSwipeCount = 0;
  mockRightSwipeCounts = {};
  mockNominatedVenueId = undefined;
  mockPartyStatus = 'lobby';
  partyListeners = [];
  memberListeners = [];
  partyVenueCache = {};
  partyMemberCache = {};
}
