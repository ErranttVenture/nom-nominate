// ===== Core Domain Types =====

export interface User {
  id: string;
  phone: string;
  displayName: string;
  createdAt: Date;
}

export interface Party {
  id: string;
  name: string;
  zipCode: string;
  centerLat: number;
  centerLng: number;
  radiusMiles: 5 | 10 | 15 | 25;
  date?: string; // ISO date string, optional
  creatorId: string;
  memberIds: string[];
  status: PartyStatus;
  nominatedVenueId?: string;
  nominatedVenueVotes?: number; // Number of right-swipes on winning venue
  venuesFetched?: number; // Total venues fetched from Google so far
  venuesExhausted?: boolean; // True when no more Google results available
  completedShifts?: number; // Number of coordinate shifts tried (0-20)
  expectedMembers?: number; // 2-6 for exact count, 0 for "6+" non-unanimous mode
  createdAt: Date;
  updatedAt: Date;
}

export type PartyStatus = 'lobby' | 'swiping' | 'nominated' | 'results';

export interface PartyMember {
  userId: string;
  displayName: string;
  joinedAt: Date;
  status: 'declined' | 'invited' | 'joined' | 'swiping' | 'done';
  swipeCount: number;
}

export interface Venue {
  id: string; // Google Places ID
  name: string;
  cuisine: string;
  rating: number;
  priceLevel: number; // 1-4
  photoUrl?: string | null;
  lat: number;
  lng: number;
  distanceMiles: number;
  address: string;
  openingHours?: DayHours[] | null;
  isOpenOnDate?: boolean | null;
  hasOffer: boolean;
  offer?: SponsoredOffer | null;
  priorityScore?: number;
}

export interface DayHours {
  day: number; // 0=Sunday, 6=Saturday
  open: string; // "10:00"
  close: string; // "22:00"
}

export interface Swipe {
  id: string;
  partyId: string;
  userId: string;
  venueId: string;
  direction: 'left' | 'right';
  timestamp: Date;
}

export interface VenueVotes {
  venueId: string;
  venueName: string;
  cuisine: string;
  rightSwipes: number;
  totalMembers: number;
  percentage: number;
}

export interface SponsoredOffer {
  id: string;
  venueId: string;
  title: string;
  description: string;
  validUntil: Date;
}

// ===== Navigation Types =====

export type RootStackParamList = {
  '(tabs)': undefined;
  'party/[id]': { id: string };
  'party/create': undefined;
  'party/swipe': { partyId: string };
  'party/results': { partyId: string };
};
