import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { COLLECTIONS } from './config';
import { searchVenues } from '@/lib/api/places';
import { geocodeZipCode } from '@/lib/api/geocoding';
import { MILES_TO_METERS } from '@/constants';
import type { Party, PartyMember, Venue } from '@/types';

/** Strip keys with undefined values — Firestore rejects undefined. */
function stripUndefined(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
}

interface CreatePartyInput {
  name: string;
  zipCode: string;
  radiusMiles: 5 | 10 | 15 | 25;
  date?: string;
  creatorId: string;
}

/**
 * Create a new Party and add the creator as the first member.
 */
export async function createParty(input: CreatePartyInput): Promise<string> {
  const { name, zipCode, radiusMiles, date, creatorId } = input;

  // Geocode zip code to lat/lng
  const { lat, lng } = await geocodeZipCode(zipCode);

  // Create party document
  const partyRef = firestore().collection(COLLECTIONS.PARTIES).doc();
  const partyData: Omit<Party, 'createdAt' | 'updatedAt'> & Record<string, any> = {
    id: partyRef.id,
    name,
    zipCode,
    centerLat: lat,
    centerLng: lng,
    radiusMiles,
    status: 'lobby',
    creatorId,
    memberIds: [creatorId],
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  };

  if (date) {
    partyData.date = date;
  }

  await partyRef.set(partyData);

  // Add creator as first member
  const user = auth().currentUser;
  const memberData: Omit<PartyMember, 'joinedAt'> & Record<string, any> = {
    userId: creatorId,
    displayName: user?.displayName ?? 'Host',
    joinedAt: firestore.FieldValue.serverTimestamp(),
    status: 'joined',
    swipeCount: 0,
  };

  await partyRef.collection(COLLECTIONS.PARTY_MEMBERS).doc(creatorId).set(memberData);

  return partyRef.id;
}

/**
 * Join an existing Party via deep link.
 */
export async function joinParty(partyId: string): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('Not authenticated.');

  const partyRef = firestore().collection(COLLECTIONS.PARTIES).doc(partyId);
  const partyDoc = await partyRef.get();

  if (!partyDoc.exists) throw new Error('Party not found.');

  const party = partyDoc.data() as Party;

  // Check if already a member
  if (party.memberIds.includes(user.uid)) return;

  // Add to memberIds array
  await partyRef.update({
    memberIds: firestore.FieldValue.arrayUnion(user.uid),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  // Add member document
  await partyRef.collection(COLLECTIONS.PARTY_MEMBERS).doc(user.uid).set({
    userId: user.uid,
    displayName: user.displayName ?? 'Member',
    joinedAt: firestore.FieldValue.serverTimestamp(),
    status: 'joined',
    swipeCount: 0,
  });
}

/**
 * Start the swiping session — fetches venues and transitions party status.
 */
export async function startSwipingSession(partyId: string): Promise<void> {
  const partyRef = firestore().collection(COLLECTIONS.PARTIES).doc(partyId);
  const partyDoc = await partyRef.get();
  const party = partyDoc.data() as Party;

  // Fetch venues from Google Places
  const radiusMeters = party.radiusMiles * MILES_TO_METERS;
  const venues = await searchVenues({
    lat: party.centerLat,
    lng: party.centerLng,
    radiusMeters,
    date: party.date,
  });

  if (venues.length === 0) {
    throw new Error(
      'No restaurants found in this area. Try a different zip code or a larger search radius.'
    );
  }

  // Cache venues in Firestore subcollection
  const batch = firestore().batch();
  venues.forEach((venue) => {
    const venueRef = partyRef.collection(COLLECTIONS.VENUES).doc(venue.id);
    batch.set(venueRef, stripUndefined({ ...venue, priorityScore: 0 }));
  });

  // Update party status
  batch.update(partyRef, {
    status: 'swiping',
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
}

/**
 * Get a Party document by ID.
 */
export async function getParty(partyId: string): Promise<Party | null> {
  const doc = await firestore()
    .collection(COLLECTIONS.PARTIES)
    .doc(partyId)
    .get();

  return doc.exists ? (doc.data() as Party) : null;
}

/**
 * Get cached venues for a Party, sorted by priority score.
 */
export async function getPartyVenues(partyId: string): Promise<Venue[]> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.PARTIES)
    .doc(partyId)
    .collection(COLLECTIONS.VENUES)
    .orderBy('priorityScore', 'desc')
    .get();

  return snapshot.docs.map((doc) => doc.data() as Venue);
}

/**
 * Get members of a Party.
 */
export async function getPartyMembers(partyId: string): Promise<PartyMember[]> {
  const snapshot = await firestore()
    .collection(COLLECTIONS.PARTIES)
    .doc(partyId)
    .collection(COLLECTIONS.PARTY_MEMBERS)
    .get();

  return snapshot.docs.map((doc) => doc.data() as PartyMember);
}

/**
 * Get all Parties for the current user.
 */
export async function getUserParties(): Promise<{ active: Party[]; past: Party[] }> {
  const user = auth().currentUser;
  if (!user) return { active: [], past: [] };

  const snapshot = await firestore()
    .collection(COLLECTIONS.PARTIES)
    .where('memberIds', 'array-contains', user.uid)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const parties = snapshot.docs.map((doc) => doc.data() as Party);

  return {
    active: parties.filter((p) => p.status === 'lobby' || p.status === 'swiping'),
    past: parties.filter((p) => p.status === 'nominated' || p.status === 'results'),
  };
}

/**
 * Real-time listener for a Party document.
 * Returns an unsubscribe function.
 */
export function onPartySnapshot(
  partyId: string,
  callback: (party: Party | null) => void
): () => void {
  return firestore()
    .collection(COLLECTIONS.PARTIES)
    .doc(partyId)
    .onSnapshot(
      (doc) => {
        if (doc.exists) {
          callback(doc.data() as Party);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Party snapshot error:', error);
        callback(null);
      }
    );
}

/**
 * Real-time listener for Party members subcollection.
 * Returns an unsubscribe function.
 */
export function onMembersSnapshot(
  partyId: string,
  callback: (members: PartyMember[]) => void
): () => void {
  return firestore()
    .collection(COLLECTIONS.PARTIES)
    .doc(partyId)
    .collection(COLLECTIONS.PARTY_MEMBERS)
    .onSnapshot(
      (snapshot) => {
        const members = snapshot.docs.map((doc) => doc.data() as PartyMember);
        callback(members);
      },
      (error) => {
        console.error('Members snapshot error:', error);
        callback([]);
      }
    );
}

/**
 * Update party radius and re-fetch venues.
 */
export async function updatePartyRadius(
  partyId: string,
  newRadius: 5 | 10 | 15 | 25
): Promise<Venue[]> {
  const partyRef = firestore().collection(COLLECTIONS.PARTIES).doc(partyId);
  const partyDoc = await partyRef.get();
  const party = partyDoc.data() as Party;

  // Update radius
  await partyRef.update({
    radiusMiles: newRadius,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  // Re-fetch venues with new radius
  const radiusMeters = newRadius * MILES_TO_METERS;
  const venues = await searchVenues({
    lat: party.centerLat,
    lng: party.centerLng,
    radiusMeters,
    date: party.date,
  });

  // Clear old venues and write new ones
  const oldVenues = await partyRef.collection(COLLECTIONS.VENUES).get();
  const batch = firestore().batch();
  oldVenues.docs.forEach((doc) => batch.delete(doc.ref));
  venues.forEach((venue) => {
    const venueRef = partyRef.collection(COLLECTIONS.VENUES).doc(venue.id);
    batch.set(venueRef, stripUndefined({ ...venue, priorityScore: 0 }));
  });
  await batch.commit();

  return venues;
}
