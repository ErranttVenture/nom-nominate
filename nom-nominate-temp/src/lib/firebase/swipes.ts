import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from './config';
import { COLLECTIONS } from './config';
import type { VenueVotes } from '@/types';
import { getCurrentUserId } from './currentUser';

interface RecordSwipeInput {
  partyId: string;
  venueId: string;
  direction: 'left' | 'right';
}

/**
 * Record a swipe in Firestore.
 * Also increments the member's swipe count.
 */
export async function recordSwipe(input: RecordSwipeInput): Promise<void> {
  const userId = getCurrentUserId();

  const { partyId, venueId, direction } = input;
  const partyRef = doc(db, COLLECTIONS.PARTIES, partyId);

  const batch = writeBatch(db);

  // Create swipe document
  const swipeRef = doc(collection(db, COLLECTIONS.PARTIES, partyId, COLLECTIONS.SWIPES));
  batch.set(swipeRef, {
    id: swipeRef.id,
    userId,
    venueId,
    direction,
    timestamp: serverTimestamp(),
  });

  // Increment member swipe count
  const memberRef = doc(db, COLLECTIONS.PARTIES, partyId, COLLECTIONS.PARTY_MEMBERS, userId);
  batch.update(memberRef, {
    swipeCount: increment(1),
    status: 'swiping',
  });

  await batch.commit();
}

/**
 * Get the set of venue IDs the current user has already swiped on.
 */
export async function getUserSwipedVenueIds(partyId: string): Promise<Set<string>> {
  let userId: string;
  try {
    userId = getCurrentUserId();
  } catch {
    return new Set();
  }

  const swipesRef = collection(db, COLLECTIONS.PARTIES, partyId, COLLECTIONS.SWIPES);
  const q = query(swipesRef, where('userId', '==', userId));
  const snapshot = await getDocs(q);

  return new Set(snapshot.docs.map((doc) => doc.data().venueId));
}

/**
 * Calculate vote results for a Party.
 * Returns venues sorted by right-swipe percentage.
 */
export async function getVoteResults(partyId: string): Promise<VenueVotes[]> {
  const partyRef = doc(db, COLLECTIONS.PARTIES, partyId);

  // Get party for member count
  const { getDoc } = await import('firebase/firestore');
  const partyDoc = await getDoc(partyRef);
  const party = partyDoc.data();
  if (!party) return [];

  const totalMembers = party.memberIds.length;

  // Get all right swipes
  const swipesRef = collection(db, COLLECTIONS.PARTIES, partyId, COLLECTIONS.SWIPES);
  const q = query(swipesRef, where('direction', '==', 'right'));
  const swipesSnapshot = await getDocs(q);

  // Count unique voters per venue
  const venueVoters: Record<string, Set<string>> = {};
  swipesSnapshot.docs.forEach((doc) => {
    const swipe = doc.data();
    if (!venueVoters[swipe.venueId]) {
      venueVoters[swipe.venueId] = new Set();
    }
    venueVoters[swipe.venueId].add(swipe.userId);
  });

  // Get venue names from cached venues
  const venuesRef = collection(db, COLLECTIONS.PARTIES, partyId, COLLECTIONS.VENUES);
  const venuesSnapshot = await getDocs(venuesRef);
  const venueMap: Record<string, { name: string; cuisine: string }> = {};
  venuesSnapshot.docs.forEach((doc) => {
    const v = doc.data();
    venueMap[doc.id] = { name: v.name, cuisine: v.cuisine };
  });

  // Build results
  const results: VenueVotes[] = Object.entries(venueVoters)
    .map(([venueId, voters]) => ({
      venueId,
      venueName: venueMap[venueId]?.name ?? 'Unknown',
      cuisine: venueMap[venueId]?.cuisine ?? '',
      rightSwipes: voters.size,
      totalMembers,
      percentage: Math.round((voters.size / totalMembers) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage || b.rightSwipes - a.rightSwipes);

  return results;
}
