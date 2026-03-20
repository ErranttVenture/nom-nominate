import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { COLLECTIONS } from './config';
import type { VenueVotes } from '@/types';

interface RecordSwipeInput {
  partyId: string;
  venueId: string;
  direction: 'left' | 'right';
}

/**
 * Record a swipe in Firestore.
 * Also increments the member's swipe count, boosts venue priority
 * on right-swipes, and checks if all members are done.
 */
export async function recordSwipe(input: RecordSwipeInput): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('Not authenticated.');

  const { partyId, venueId, direction } = input;
  const partyRef = firestore().collection(COLLECTIONS.PARTIES).doc(partyId);

  const batch = firestore().batch();

  // Create swipe document
  const swipeRef = partyRef.collection(COLLECTIONS.SWIPES).doc();
  batch.set(swipeRef, {
    id: swipeRef.id,
    userId: user.uid,
    venueId,
    direction,
    timestamp: firestore.FieldValue.serverTimestamp(),
  });

  // Increment member swipe count
  const memberRef = partyRef
    .collection(COLLECTIONS.PARTY_MEMBERS)
    .doc(user.uid);
  batch.update(memberRef, {
    swipeCount: firestore.FieldValue.increment(1),
    status: 'swiping',
  });

  // Boost venue priority on right-swipe so other members see it sooner
  if (direction === 'right') {
    const venueRef = partyRef.collection(COLLECTIONS.VENUES).doc(venueId);
    batch.update(venueRef, {
      priorityScore: firestore.FieldValue.increment(1),
    });
  }

  await batch.commit();
}

/**
 * Mark the current user as done swiping, then check if all members
 * are finished. If everyone is done, auto-nominate the top venue.
 */
export async function markDoneAndCheckNomination(partyId: string): Promise<void> {
  const user = auth().currentUser;
  if (!user) return;

  const partyRef = firestore().collection(COLLECTIONS.PARTIES).doc(partyId);

  // Mark this member as done
  await partyRef
    .collection(COLLECTIONS.PARTY_MEMBERS)
    .doc(user.uid)
    .update({ status: 'done' });

  // Check if ALL members are now done
  const membersSnapshot = await partyRef
    .collection(COLLECTIONS.PARTY_MEMBERS)
    .get();

  const allDone = membersSnapshot.docs.every((doc) => {
    const status = doc.data().status;
    return status === 'done';
  });

  if (allDone) {
    console.log('[Swipes] All members done — auto-nominating winner');
    await nominateWinner(partyId);
  }
}

/**
 * Calculate vote results and nominate the top venue.
 * Updates party status to 'nominated'.
 */
async function nominateWinner(partyId: string): Promise<void> {
  const results = await getVoteResults(partyId);

  if (results.length === 0) {
    console.warn('[Swipes] No right-swipes recorded, cannot nominate');
    return;
  }

  const winner = results[0];
  console.log('[Swipes] Winner:', winner.venueName, `(${winner.percentage}%)`);

  await firestore()
    .collection(COLLECTIONS.PARTIES)
    .doc(partyId)
    .update({
      status: 'nominated',
      nominatedVenueId: winner.venueId,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Get the set of venue IDs the current user has already swiped on.
 * Used to skip venues the user has already seen.
 */
export async function getUserSwipedVenueIds(partyId: string): Promise<Set<string>> {
  const user = auth().currentUser;
  if (!user) return new Set();

  const snapshot = await firestore()
    .collection(COLLECTIONS.PARTIES)
    .doc(partyId)
    .collection(COLLECTIONS.SWIPES)
    .where('userId', '==', user.uid)
    .get();

  return new Set(snapshot.docs.map((doc) => doc.data().venueId));
}

/**
 * Calculate vote results for a Party.
 * Returns venues sorted by right-swipe percentage.
 */
export async function getVoteResults(partyId: string): Promise<VenueVotes[]> {
  const partyRef = firestore().collection(COLLECTIONS.PARTIES).doc(partyId);

  // Get party for member count
  const partyDoc = await partyRef.get();
  const party = partyDoc.data();
  if (!party) return [];

  const totalMembers = party.memberIds.length;

  // Get all right swipes
  const swipesSnapshot = await partyRef
    .collection(COLLECTIONS.SWIPES)
    .where('direction', '==', 'right')
    .get();

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
  const venuesSnapshot = await partyRef.collection(COLLECTIONS.VENUES).get();
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
