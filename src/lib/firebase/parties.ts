import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { COLLECTIONS } from './config';
import { searchVenues } from '@/lib/api/places';
import { geocodeZipCode } from '@/lib/api/geocoding';
import { MILES_TO_METERS } from '@/constants';
import { allocatePartyCode, resolveCodeToPartyId } from './shortCode';
import type { Party, PartyMember, Venue } from '@/types';

/** Strip keys with undefined values — Firestore rejects undefined. */
function stripUndefined(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
}

/**
 * Compute 20 coordinate shift offsets for a given radius.
 * - Inner ring (8): compass directions at ~40% of radius
 * - Outer ring (8): compass directions at ~75% of radius
 * - Diagonal fill (4): intermediate angles at ~55% of radius
 *
 * 1 mile ≈ 0.01449 degrees latitude.
 * Longitude degrees vary by latitude; we approximate using cos(lat).
 */
function computeCoordinateShifts(
  radiusMiles: number,
  centerLat: number,
): { latOffset: number; lngOffset: number }[] {
  const mileToDegLat = 0.01449;
  const mileToDegLng = mileToDegLat / Math.cos(centerLat * (Math.PI / 180));

  const shifts: { latOffset: number; lngOffset: number }[] = [];

  // Helper: generate offset from angle (degrees) and distance (miles)
  const addShift = (angleDeg: number, distMiles: number) => {
    const rad = angleDeg * (Math.PI / 180);
    shifts.push({
      latOffset: Math.cos(rad) * distMiles * mileToDegLat,
      lngOffset: Math.sin(rad) * distMiles * mileToDegLng,
    });
  };

  const innerDist = radiusMiles * 0.4;
  const outerDist = radiusMiles * 0.75;
  const diagDist = radiusMiles * 0.55;

  // Inner ring: 8 compass directions (N=0, NE=45, E=90, ...)
  for (let angle = 0; angle < 360; angle += 45) {
    addShift(angle, innerDist);
  }

  // Outer ring: 8 compass directions offset by 22.5° (NNE, ENE, ...)
  for (let angle = 22.5; angle < 360; angle += 45) {
    addShift(angle, outerDist);
  }

  // Diagonal fill: 4 intermediate angles
  for (const angle of [11.25, 78.75, 191.25, 258.75]) {
    addShift(angle, diagDist);
  }

  return shifts;
}

interface CreatePartyInput {
  name: string;
  zipCode: string;
  radiusMiles: 5 | 10 | 15 | 25;
  date?: string;
  expectedMembers: number; // 2-6 for exact count, 0 for "6+" non-unanimous mode
  creatorId: string;
}

/**
 * Create a new Party and add the creator as the first member.
 */
export async function createParty(input: CreatePartyInput): Promise<string> {
  const { name, zipCode, radiusMiles, date, expectedMembers, creatorId } = input;

  // Geocode zip code to lat/lng
  const { lat, lng } = await geocodeZipCode(zipCode);

  // Create party document + allocate short code in parallel
  const partyRef = firestore().collection(COLLECTIONS.PARTIES).doc();
  const joinCode = await allocatePartyCode(partyRef.id);

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
    expectedMembers,
    joinCode,
    venuesFetched: 0,
    venuesExhausted: false,
    completedShifts: 0,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  };

  if (date) {
    partyData.date = date;
  }

  await partyRef.set(partyData);

  // Add creator as first member
  const user = auth().currentUser;
  const memberData: Record<string, any> = {
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

  if (!partyDoc.exists()) throw new Error('Party not found.');

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
 * Join a Party using its 5-char short code. Returns the party ID.
 * Throws if the code is invalid or the party no longer exists.
 */
export async function joinPartyByCode(rawCode: string): Promise<string> {
  const partyId = await resolveCodeToPartyId(rawCode);
  if (!partyId) {
    throw new Error("That code doesn't look right — double-check with your host.");
  }
  await joinParty(partyId);
  return partyId;
}

/**
 * Ensure the party has started swiping.
 * Any member can call this — it's idempotent.
 * If the party is still in 'lobby', transitions to 'swiping' and fetches
 * the first batch of venues from Google Places.
 */
export async function ensureSwipingStarted(partyId: string): Promise<void> {
  const partyRef = firestore().collection(COLLECTIONS.PARTIES).doc(partyId);
  const partyDoc = await partyRef.get();
  const party = partyDoc.data() as Party;

  // Already swiping or beyond — nothing to do
  if (party.status !== 'lobby') return;

  // Fetch first batch of venues (center point)
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
    venuesFetched: venues.length,
    venuesExhausted: false,
    completedShifts: 0,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
  console.log(`[Parties] Started swiping with ${venues.length} venues`);
}

/**
 * Fetch more venues using coordinate shifting.
 * Each call tries the next shift position and returns new unique venues.
 * Returns the number of new venues added (0 if all shifts exhausted).
 */
export async function fetchMoreVenues(partyId: string): Promise<number> {
  const partyRef = firestore().collection(COLLECTIONS.PARTIES).doc(partyId);
  const partyDoc = await partyRef.get();
  const party = partyDoc.data() as Party;

  const completed = party.completedShifts ?? 0;

  if (party.venuesExhausted || completed >= 20) {
    console.log('[Parties] All coordinate shifts exhausted');
    await partyRef.update({
      venuesExhausted: true,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    return 0;
  }

  // Compute shifts for this party's radius and latitude
  const shifts = computeCoordinateShifts(party.radiusMiles, party.centerLat);

  if (completed >= shifts.length) {
    console.log('[Parties] All shifts completed');
    await partyRef.update({
      venuesExhausted: true,
      completedShifts: completed,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    return 0;
  }

  const shift = shifts[completed];
  const shiftedLat = party.centerLat + shift.latOffset;
  const shiftedLng = party.centerLng + shift.lngOffset;
  const radiusMeters = party.radiusMiles * MILES_TO_METERS;

  console.log(`[Parties] Trying shift ${completed + 1}/20: lat+${shift.latOffset.toFixed(4)}, lng+${shift.lngOffset.toFixed(4)}`);

  const venues = await searchVenues({
    lat: shiftedLat,
    lng: shiftedLng,
    radiusMeters,
    date: party.date,
  });

  // Get existing venues for de-duplication (by ID and by name)
  const existingVenues = await partyRef.collection(COLLECTIONS.VENUES).get();
  const existingIds = new Set(existingVenues.docs.map((d) => d.id));
  const existingNames = new Set(
    existingVenues.docs.map((d) => (d.data().name ?? '').trim().toLowerCase())
  );
  const newVenues = venues.filter(
    (v) => !existingIds.has(v.id) && !existingNames.has(v.name.trim().toLowerCase())
  );

  // Always increment completedShifts even if no new venues found
  const newCompleted = completed + 1;
  const isExhausted = newCompleted >= 20;

  if (newVenues.length === 0) {
    await partyRef.update({
      completedShifts: newCompleted,
      venuesExhausted: isExhausted,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    console.log(`[Parties] Shift ${newCompleted}/20: 0 new venues (all duplicates)`);
    return 0;
  }

  // Write new venues to Firestore
  const batch = firestore().batch();
  newVenues.forEach((venue) => {
    const venueRef = partyRef.collection(COLLECTIONS.VENUES).doc(venue.id);
    batch.set(venueRef, stripUndefined({ ...venue, priorityScore: 0 }));
  });

  batch.update(partyRef, {
    completedShifts: newCompleted,
    venuesFetched: firestore.FieldValue.increment(newVenues.length),
    venuesExhausted: isExhausted,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
  console.log(`[Parties] Shift ${newCompleted}/20: ${newVenues.length} new venues (${venues.length} total, ${venues.length - newVenues.length} duplicates)`);
  return newVenues.length;
}

/**
 * Expand the search radius and reset shift state.
 * De-duplicates against existing cached venues.
 */
export async function expandRadius(
  partyId: string,
  newRadius: 5 | 10 | 15 | 25,
): Promise<number> {
  const partyRef = firestore().collection(COLLECTIONS.PARTIES).doc(partyId);
  const partyDoc = await partyRef.get();
  const party = partyDoc.data() as Party;

  // Fetch first batch at new radius
  const radiusMeters = newRadius * MILES_TO_METERS;
  const venues = await searchVenues({
    lat: party.centerLat,
    lng: party.centerLng,
    radiusMeters,
    date: party.date,
  });

  // De-duplicate against existing cache (by ID and by name)
  const existingVenues = await partyRef.collection(COLLECTIONS.VENUES).get();
  const existingIds = new Set(existingVenues.docs.map((d) => d.id));
  const existingNames = new Set(
    existingVenues.docs.map((d) => (d.data().name ?? '').trim().toLowerCase())
  );
  const newVenues = venues.filter(
    (v) => !existingIds.has(v.id) && !existingNames.has(v.name.trim().toLowerCase())
  );

  // Write new venues + update party
  const batch = firestore().batch();
  newVenues.forEach((venue) => {
    const venueRef = partyRef.collection(COLLECTIONS.VENUES).doc(venue.id);
    batch.set(venueRef, stripUndefined({ ...venue, priorityScore: 0 }));
  });

  batch.update(partyRef, {
    radiusMiles: newRadius,
    completedShifts: 0,
    venuesExhausted: false,
    venuesFetched: firestore.FieldValue.increment(newVenues.length),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
  console.log(`[Parties] Expanded radius to ${newRadius}mi: ${newVenues.length} new venues`);
  return newVenues.length;
}

/**
 * Get a Party document by ID.
 */
export async function getParty(partyId: string): Promise<Party | null> {
  const doc = await firestore()
    .collection(COLLECTIONS.PARTIES)
    .doc(partyId)
    .get();

  return doc.exists() ? (doc.data() as Party) : null;
}

/**
 * Get cached venues for a Party, sorted by priority score (highest first).
 * Venues with more right-swipes appear first.
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
        if (doc.exists()) {
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
