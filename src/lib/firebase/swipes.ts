import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { COLLECTIONS } from './config';
import { PARTY } from '@/constants';
import type { VenueVotes } from '@/types';

interface RecordSwipeInput {
  partyId: string;
  venueId: string;
  direction: 'left' | 'right';
}

/**
 * Record a swipe in Firestore.
 * Also increments the member's swipe count and boosts venue priority
 * on right-swipes. After a right-swipe, checks for unanimous nomination.
 *
 * Returns { nominated: true, venueId } if the swipe triggered a win.
 */
export async function recordSwipe(
  input: RecordSwipeInput
): Promise<{ nominated: boolean; venueId?: string }> {
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

  // After a right-swipe, check if this venue now has unanimous approval
  if (direction === 'right') {
    const isUnanimous = await checkUnanimousNomination(partyId, venueId);
    if (isUnanimous) {
      return { nominated: true, venueId };
    }
  }

  return { nominated: false };
}

/**
 * Check if ALL party members have right-swiped a specific venue.
 * If so, nominate it immediately (unanimous win).
 */
async function checkUnanimousNomination(
  partyId: string,
  venueId: string
): Promise<boolean> {
  const partyRef = firestore().collection(COLLECTIONS.PARTIES).doc(partyId);

  // Check current party status — don't nominate if already nominated
  const partyDoc = await partyRef.get();
  const party = partyDoc.data();
  if (!party || party.status === 'nominated' || party.status === 'results') {
    return false;
  }

  const expected = party.expectedMembers ?? party.memberIds.length;

  // 6+ mode (expectedMembers === 0): skip unanimous check entirely
  // Nomination can only happen via fallback voting in this mode
  if (expected === 0) {
    return false;
  }

  // Get all right-swipes for this venue
  const swipesSnapshot = await partyRef
    .collection(COLLECTIONS.SWIPES)
    .where('venueId', '==', venueId)
    .where('direction', '==', 'right')
    .get();

  // Collect unique voters
  const voters = new Set(swipesSnapshot.docs.map((doc) => doc.data().userId));

  if (voters.size >= expected) {
    // UNANIMOUS! Nominate this venue
    console.log(`[Swipes] UNANIMOUS nomination! Venue ${venueId} — ${voters.size}/${expected} members agreed`);

    // Get venue name for logging
    const venueDoc = await partyRef.collection(COLLECTIONS.VENUES).doc(venueId).get();
    const venueName = venueDoc.data()?.name ?? 'Unknown';

    await partyRef.update({
      status: 'nominated',
      nominatedVenueId: venueId,
      nominatedVenueVotes: voters.size,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[Swipes] Winner: ${venueName} (${voters.size}/${expected} unanimous)`);
    return true;
  }

  return false;
}

/**
 * Check the fallback condition: all members have swiped >= MIN_SWIPES_FOR_FALLBACK.
 * If so, nominate the venue with the most right-swipes.
 *
 * Called after each swipe when a member reaches the threshold.
 */
export async function checkFallbackNomination(partyId: string): Promise<boolean> {
  const partyRef = firestore().collection(COLLECTIONS.PARTIES).doc(partyId);

  // Check current party status
  const partyDoc = await partyRef.get();
  const party = partyDoc.data();
  if (!party || party.status === 'nominated' || party.status === 'results') {
    return false;
  }

  const expected = party.expectedMembers ?? party.memberIds.length;

  // Check if enough members have swiped at least MIN_SWIPES_FOR_FALLBACK times
  const membersSnapshot = await partyRef
    .collection(COLLECTIONS.PARTY_MEMBERS)
    .get();

  const membersAtThreshold = membersSnapshot.docs.filter((doc) => {
    const member = doc.data();
    return member.swipeCount >= PARTY.MIN_SWIPES_FOR_FALLBACK;
  });

  if (expected === 0) {
    // 6+ mode: require at least 6 members at threshold AND all current members at threshold
    const allCurrentHitThreshold = membersSnapshot.docs.every((doc) => {
      return doc.data().swipeCount >= PARTY.MIN_SWIPES_FOR_FALLBACK;
    });
    if (membersAtThreshold.length < 6 || !allCurrentHitThreshold) return false;
  } else {
    // Exact mode (2-6): require expectedMembers worth of members at threshold
    if (membersAtThreshold.length < expected) return false;
  }

  // All members have hit the threshold — nominate the top venue
  console.log('[Swipes] All members hit fallback threshold — nominating top venue');
  const results = await getVoteResults(partyId);

  if (results.length === 0) {
    console.warn('[Swipes] No right-swipes recorded, cannot nominate via fallback');
    return false;
  }

  const winner = results[0];
  console.log(`[Swipes] Fallback winner: ${winner.venueName} (${winner.rightSwipes} votes, ${winner.percentage}%)`);

  await partyRef.update({
    status: 'nominated',
    nominatedVenueId: winner.venueId,
    nominatedVenueVotes: winner.rightSwipes,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  return true;
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
 * Get the current user's swipe count for a party.
 */
export async function getUserSwipeCount(partyId: string): Promise<number> {
  const user = auth().currentUser;
  if (!user) return 0;

  const memberDoc = await firestore()
    .collection(COLLECTIONS.PARTIES)
    .doc(partyId)
    .collection(COLLECTIONS.PARTY_MEMBERS)
    .doc(user.uid)
    .get();

  return memberDoc.data()?.swipeCount ?? 0;
}

/**
 * Calculate vote results for a Party.
 * Returns venues sorted by right-swipe count (descending).
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
    .sort((a, b) => b.rightSwipes - a.rightSwipes || b.percentage - a.percentage);

  return results;
}
