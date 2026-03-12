import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './config';
import { COLLECTIONS } from './config';
import type { Party, PartyMember, Venue } from '@/types';
import { geocodeZipCode, searchNearbyRestaurants } from './places';
import { getCurrentUserId, getCurrentUserDisplayName } from './currentUser';

interface CreatePartyInput {
  name: string;
  zipCode: string;
  radiusMiles: number;
  date?: string;
  creatorId: string;
}

/**
 * Create a new Party and add the creator as the first member.
 * Geocodes the zip code to get real lat/lng.
 */
export async function createParty(input: CreatePartyInput): Promise<string> {
  const { name, zipCode, radiusMiles, date, creatorId } = input;

  // Real geocoding from zip code
  const { lat, lng } = await geocodeZipCode(zipCode);

  // Create party document
  const partyRef = doc(collection(db, COLLECTIONS.PARTIES));
  const partyData: Record<string, any> = {
    id: partyRef.id,
    name,
    zipCode,
    centerLat: lat,
    centerLng: lng,
    radiusMiles,
    status: 'lobby',
    creatorId,
    memberIds: [creatorId],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (date) {
    partyData.date = date;
  }

  await setDoc(partyRef, partyData);

  // Add creator as first member
  const displayName = getCurrentUserDisplayName();
  const memberRef = doc(db, COLLECTIONS.PARTIES, partyRef.id, COLLECTIONS.PARTY_MEMBERS, creatorId);
  await setDoc(memberRef, {
    userId: creatorId,
    displayName: displayName || 'Host',
    joinedAt: serverTimestamp(),
    status: 'joined',
    swipeCount: 0,
  });

  return partyRef.id;
}

/**
 * Join an existing Party via deep link.
 */
export async function joinParty(partyId: string): Promise<void> {
  const userId = getCurrentUserId();
  const displayName = getCurrentUserDisplayName();

  const partyRef = doc(db, COLLECTIONS.PARTIES, partyId);
  const partyDoc = await getDoc(partyRef);

  if (!partyDoc.exists()) throw new Error('Party not found.');

  const party = partyDoc.data() as Party;

  // Check if already a member
  if (party.memberIds.includes(userId)) return;

  // Add to memberIds array
  await updateDoc(partyRef, {
    memberIds: arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });

  // Add member document
  const memberRef = doc(db, COLLECTIONS.PARTIES, partyId, COLLECTIONS.PARTY_MEMBERS, userId);
  await setDoc(memberRef, {
    userId,
    displayName: displayName || 'Member',
    joinedAt: serverTimestamp(),
    status: 'joined',
    swipeCount: 0,
  });
}

/**
 * Start the swiping session:
 * 1. Fetch nearby restaurants from Google Places API
 * 2. Cache them as venue sub-documents in Firestore
 * 3. Transition party status to 'swiping'
 */
export async function startSwipingSession(partyId: string): Promise<void> {
  const partyRef = doc(db, COLLECTIONS.PARTIES, partyId);
  const partyDoc = await getDoc(partyRef);

  if (!partyDoc.exists()) throw new Error('Party not found.');

  const party = partyDoc.data() as Party;

  // Fetch real restaurants from Google Places
  const venues = await searchNearbyRestaurants({
    lat: party.centerLat,
    lng: party.centerLng,
    radiusMiles: party.radiusMiles,
    maxResults: 20,
  });

  // Cache venues in Firestore sub-collection using batched writes
  const batch = writeBatch(db);
  venues.forEach((venue, index) => {
    const venueRef = doc(db, COLLECTIONS.PARTIES, partyId, COLLECTIONS.VENUES, venue.id);
    batch.set(venueRef, {
      ...venue,
      priorityScore: venues.length - index, // higher score = shown first
    });
  });
  await batch.commit();

  // Transition to swiping
  await updateDoc(partyRef, {
    status: 'swiping',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get a Party document by ID.
 */
export async function getParty(partyId: string): Promise<Party | null> {
  const partyDoc = await getDoc(doc(db, COLLECTIONS.PARTIES, partyId));
  return partyDoc.exists() ? (partyDoc.data() as Party) : null;
}

/**
 * Get cached venues for a Party, sorted by priority score.
 */
export async function getPartyVenues(partyId: string): Promise<Venue[]> {
  const venuesRef = collection(db, COLLECTIONS.PARTIES, partyId, COLLECTIONS.VENUES);

  try {
    // Try with ordering first
    const q = query(venuesRef, orderBy('priorityScore', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => doc.data() as Venue);
  } catch (error) {
    // Fall back to unordered query if index doesn't exist yet
    console.warn('priorityScore orderBy failed, falling back to unordered:', error);
    const snapshot = await getDocs(venuesRef);
    const venues = snapshot.docs.map((doc) => doc.data() as Venue);
    return venues.sort((a: any, b: any) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
  }
}

/**
 * Get members of a Party.
 */
export async function getPartyMembers(partyId: string): Promise<PartyMember[]> {
  const membersRef = collection(db, COLLECTIONS.PARTIES, partyId, COLLECTIONS.PARTY_MEMBERS);
  const snapshot = await getDocs(membersRef);

  return snapshot.docs.map((doc) => doc.data() as PartyMember);
}

/**
 * Get all Parties for the current user.
 */
export async function getUserParties(): Promise<{ active: Party[]; past: Party[] }> {
  let userId: string;
  try {
    userId = getCurrentUserId();
  } catch {
    return { active: [], past: [] };
  }

  const partiesRef = collection(db, COLLECTIONS.PARTIES);
  const q = query(
    partiesRef,
    where('memberIds', 'array-contains', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const snapshot = await getDocs(q);

  const parties = snapshot.docs.map((doc) => doc.data() as Party);

  return {
    active: parties.filter((p) => p.status === 'lobby' || p.status === 'swiping'),
    past: parties.filter((p) => p.status === 'nominated' || p.status === 'results'),
  };
}

/**
 * Real-time listener for party changes.
 */
export function onPartySnapshot(partyId: string, callback: (party: Party) => void): () => void {
  const partyRef = doc(db, COLLECTIONS.PARTIES, partyId);
  return onSnapshot(partyRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as Party);
    }
  });
}

/**
 * Real-time listener for member changes.
 */
export function onMembersSnapshot(partyId: string, callback: (members: PartyMember[]) => void): () => void {
  const membersRef = collection(db, COLLECTIONS.PARTIES, partyId, COLLECTIONS.PARTY_MEMBERS);
  return onSnapshot(membersRef, (snapshot) => {
    callback(snapshot.docs.map((doc) => doc.data() as PartyMember));
  });
}
