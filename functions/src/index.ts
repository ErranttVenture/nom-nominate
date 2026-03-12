import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

/**
 * Triggered when a swipe is recorded.
 * Checks if a nomination threshold has been reached.
 */
export const onSwipe = functions.firestore
  .document('parties/{partyId}/swipes/{swipeId}')
  .onCreate(async (snap, context) => {
    const { partyId } = context.params;
    const swipe = snap.data();

    if (swipe.direction !== 'right') return;

    const partyDoc = await db.doc(`parties/${partyId}`).get();
    const party = partyDoc.data();
    if (!party || party.status === 'nominated') return;

    const memberCount = party.memberIds.length;
    const isLargeGroup = memberCount >= 10;
    const threshold = isLargeGroup ? Math.ceil(memberCount * 0.8) : memberCount;

    // Count right swipes for this venue
    const rightSwipes = await db
      .collection(`parties/${partyId}/swipes`)
      .where('venueId', '==', swipe.venueId)
      .where('direction', '==', 'right')
      .get();

    const uniqueVoters = new Set(rightSwipes.docs.map((d) => d.data().userId));

    if (uniqueVoters.size >= threshold) {
      // Nomination achieved!
      await db.doc(`parties/${partyId}`).update({
        status: 'nominated',
        nominatedVenueId: swipe.venueId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Send push notifications to all members
      const tokens = await getTokensForUsers(party.memberIds);
      if (tokens.length > 0) {
        await admin.messaging().sendEachForMulticast({
          tokens,
          notification: {
            title: 'A nom has been nominated! 🎉',
            body: `Your party "${party.name}" has picked a winner!`,
          },
          data: {
            partyId,
            type: 'nomination',
          },
        });
      }
    }

    // Check if we need to trigger the "Show Results" fallback
    await checkFallback(partyId, party);
  });

/**
 * Checks if all members have swiped 20+ times without a nomination.
 */
async function checkFallback(partyId: string, party: any) {
  const members = await db.collection(`parties/${partyId}/members`).get();

  const allAtThreshold = members.docs.every((doc) => {
    const member = doc.data();
    return member.swipeCount >= 20;
  });

  if (allAtThreshold && party.status === 'swiping') {
    await db.doc(`parties/${partyId}`).update({
      status: 'results',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

/**
 * When a user right-swipes a venue, boost its priority for other members.
 * Updates the venue's priority score in the party's venue queue.
 */
export const boostVenuePriority = functions.firestore
  .document('parties/{partyId}/swipes/{swipeId}')
  .onCreate(async (snap, context) => {
    const { partyId } = context.params;
    const swipe = snap.data();

    if (swipe.direction !== 'right') return;

    const venueRef = db.doc(`parties/${partyId}/venues/${swipe.venueId}`);
    await venueRef.update({
      priorityScore: admin.firestore.FieldValue.increment(1),
    });
  });

/**
 * Helper: get FCM tokens for a list of user IDs.
 */
async function getTokensForUsers(userIds: string[]): Promise<string[]> {
  const tokens: string[] = [];
  for (const uid of userIds) {
    const userDoc = await db.doc(`users/${uid}`).get();
    const token = userDoc.data()?.fcmToken;
    if (token) tokens.push(token);
  }
  return tokens;
}
