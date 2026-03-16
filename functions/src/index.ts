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

// ---------------------------------------------------------------------------
// Analytics Pipeline
// ---------------------------------------------------------------------------

/**
 * Helper: get today's date as YYYY-MM-DD string.
 */
function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Helper: get the ISO week ID as YYYY-WNN.
 */
function getWeekId(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * Helper: get Monday and Sunday for a given date's week.
 */
function getWeekBounds(date: Date): { weekStart: string; weekEnd: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0],
  };
}

/**
 * onVenueSwipe - Firestore trigger on swipe documents.
 * When a user swipes on a venue, updates the venue's daily analytics
 * and the running summary for the restaurant dashboard.
 */
export const onVenueSwipe = functions.firestore
  .document('parties/{partyId}/swipes/{swipeId}')
  .onCreate(async (snap, context) => {
    const swipe = snap.data();
    const venueId = swipe.venueId as string;

    if (!venueId) return;

    const today = getTodayDateString();
    const dailyRef = db.doc(`restaurants/${venueId}/analytics/daily/${today}`);
    const summaryRef = db.doc(`restaurants/${venueId}/analytics/summary`);

    const isRight = swipe.direction === 'right';
    const isLeft = swipe.direction === 'left';

    // Update daily analytics
    const dailyUpdate: Record<string, any> = {
      impressions: admin.firestore.FieldValue.increment(1),
      date: today,
    };
    if (isRight) {
      dailyUpdate.swipeRight = admin.firestore.FieldValue.increment(1);
    }
    if (isLeft) {
      dailyUpdate.swipeLeft = admin.firestore.FieldValue.increment(1);
    }

    await dailyRef.set(dailyUpdate, { merge: true });

    // Recalculate swipeRightRate for the day
    const dailySnap = await dailyRef.get();
    const dailyData = dailySnap.data() || {};
    const right = dailyData.swipeRight || 0;
    const left = dailyData.swipeLeft || 0;
    const total = right + left;
    if (total > 0) {
      await dailyRef.update({
        swipeRightRate: Math.round((right / total) * 10000) / 100,
      });
    }

    // Update summary totals
    const summaryUpdate: Record<string, any> = {
      totalImpressions: admin.firestore.FieldValue.increment(1),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (isRight) {
      summaryUpdate.totalSwipeRight = admin.firestore.FieldValue.increment(1);
    }
    if (isLeft) {
      summaryUpdate.totalSwipeLeft = admin.firestore.FieldValue.increment(1);
    }

    await summaryRef.set(summaryUpdate, { merge: true });

    // Recalculate overall swipeRightRate in summary
    const summarySnap = await summaryRef.get();
    const summaryData = summarySnap.data() || {};
    const totalRight = summaryData.totalSwipeRight || 0;
    const totalLeft = summaryData.totalSwipeLeft || 0;
    const totalSwipes = totalRight + totalLeft;
    if (totalSwipes > 0) {
      await summaryRef.update({
        swipeRightRate: Math.round((totalRight / totalSwipes) * 10000) / 100,
      });
    }

    // Log to activity feed (only log every 50th impression to avoid flooding)
    const impressions = dailyData.impressions || 0;
    if (impressions === 1 || impressions % 50 === 0) {
      await db.collection(`restaurants/${venueId}/activity`).add({
        type: 'impression',
        message: `Your listing appeared in ${impressions} group sessions today`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Log individual swipe-right activity
    if (isRight) {
      const { partyId } = context.params;
      const partyDoc = await db.doc(`parties/${partyId}`).get();
      const party = partyDoc.data();
      const partySize = party?.memberIds?.length || 0;
      await db.collection(`restaurants/${venueId}/activity`).add({
        type: 'swipe',
        message: `A user swiped right on your restaurant${partySize > 0 ? ` (party of ${partySize})` : ''}`,
        metadata: { partyId, partySize },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

/**
 * onGroupResult - Firestore trigger when a party reaches nomination.
 * Increments groupMatches for the winning restaurant.
 */
export const onGroupResult = functions.firestore
  .document('parties/{partyId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only fire when status transitions to 'nominated'
    if (before.status === 'nominated' || after.status !== 'nominated') return;

    const venueId = after.nominatedVenueId;
    if (!venueId) return;

    const { partyId } = context.params;
    const today = getTodayDateString();
    const dailyRef = db.doc(`restaurants/${venueId}/analytics/daily/${today}`);
    const summaryRef = db.doc(`restaurants/${venueId}/analytics/summary`);

    // Increment group matches
    await dailyRef.set(
      {
        groupMatches: admin.firestore.FieldValue.increment(1),
        date: today,
      },
      { merge: true }
    );

    await summaryRef.set(
      {
        totalGroupMatches: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Log to activity feed
    const partySize = after.memberIds?.length || 0;
    await db.collection(`restaurants/${venueId}/activity`).add({
      type: 'match',
      message: `Your restaurant won a group vote (party of ${partySize})`,
      metadata: { partyId, partySize },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

/**
 * aggregateDailyAnalytics - Scheduled function (runs daily at midnight UTC).
 * Rolls up yesterday's daily stats into weekly summaries and updates
 * the summary doc with trend data (% change vs previous week).
 */
export const aggregateDailyAnalytics = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('America/New_York')
  .onRun(async () => {
    // Process yesterday's data
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const weekId = getWeekId(yesterday);
    const { weekStart, weekEnd } = getWeekBounds(yesterday);

    // Get all restaurants
    const restaurantsSnap = await db.collection('restaurants').get();

    for (const restaurantDoc of restaurantsSnap.docs) {
      const restaurantId = restaurantDoc.id;
      const dailyRef = db.doc(`restaurants/${restaurantId}/analytics/daily/${yesterdayStr}`);
      const dailySnap = await dailyRef.get();

      if (!dailySnap.exists) continue;

      const daily = dailySnap.data()!;

      // Roll up into weekly
      const weeklyRef = db.doc(`restaurants/${restaurantId}/analytics/weekly/${weekId}`);
      await weeklyRef.set(
        {
          impressions: admin.firestore.FieldValue.increment(daily.impressions || 0),
          swipeRight: admin.firestore.FieldValue.increment(daily.swipeRight || 0),
          swipeLeft: admin.firestore.FieldValue.increment(daily.swipeLeft || 0),
          groupMatches: admin.firestore.FieldValue.increment(daily.groupMatches || 0),
          offerRedemptions: admin.firestore.FieldValue.increment(daily.offerRedemptions || 0),
          weekStart,
          weekEnd,
        },
        { merge: true }
      );

      // Recalculate weekly swipeRightRate
      const weeklySnap = await weeklyRef.get();
      const weeklyData = weeklySnap.data() || {};
      const wRight = weeklyData.swipeRight || 0;
      const wLeft = weeklyData.swipeLeft || 0;
      const wTotal = wRight + wLeft;
      if (wTotal > 0) {
        await weeklyRef.update({
          swipeRightRate: Math.round((wRight / wTotal) * 10000) / 100,
        });
      }

      // Calculate trends (compare this week vs last week)
      const lastWeekDate = new Date(yesterday);
      lastWeekDate.setDate(lastWeekDate.getDate() - 7);
      const lastWeekId = getWeekId(lastWeekDate);
      const lastWeeklySnap = await db
        .doc(`restaurants/${restaurantId}/analytics/weekly/${lastWeekId}`)
        .get();
      const lastWeekly = lastWeeklySnap.data();

      const summaryRef = db.doc(`restaurants/${restaurantId}/analytics/summary`);

      if (lastWeekly) {
        const calcTrend = (current: number, previous: number): number => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return Math.round(((current - previous) / previous) * 10000) / 100;
        };

        await summaryRef.set(
          {
            impressionsTrend: calcTrend(weeklyData.impressions || 0, lastWeekly.impressions || 0),
            swipeRightRateTrend: calcTrend(weeklyData.swipeRightRate || 0, lastWeekly.swipeRightRate || 0),
            groupMatchesTrend: calcTrend(weeklyData.groupMatches || 0, lastWeekly.groupMatches || 0),
            offerRedemptionsTrend: calcTrend(weeklyData.offerRedemptions || 0, lastWeekly.offerRedemptions || 0),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    }

    return null;
  });

// ---------------------------------------------------------------------------
// Offer Redemption
// ---------------------------------------------------------------------------

/**
 * redeemOffer - HTTP callable function for processing offer redemptions.
 * Validates the offer exists, is active, not expired, and not maxed out.
 * Increments currentRedemptions and logs to the activity feed.
 */
export const redeemOffer = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { restaurantId, offerCode, partySize } = data;

  if (!restaurantId || !offerCode) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'restaurantId and offerCode are required.'
    );
  }

  // Find the offer by code
  const offersSnap = await db
    .collection(`restaurants/${restaurantId}/offers`)
    .where('code', '==', offerCode)
    .limit(1)
    .get();

  if (offersSnap.empty) {
    throw new functions.https.HttpsError('not-found', 'Offer not found.');
  }

  const offerDoc = offersSnap.docs[0];
  const offer = offerDoc.data();
  const offerRef = offerDoc.ref;

  // Validate status
  if (offer.status !== 'active') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `Offer is currently ${offer.status}. Only active offers can be redeemed.`
    );
  }

  // Validate expiry
  const now = admin.firestore.Timestamp.now();
  if (offer.validUntil && offer.validUntil.toMillis() < now.toMillis()) {
    // Auto-expire the offer
    await offerRef.update({ status: 'expired' });
    throw new functions.https.HttpsError('failed-precondition', 'Offer has expired.');
  }

  // Validate not started yet
  if (offer.validFrom && offer.validFrom.toMillis() > now.toMillis()) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Offer has not started yet.'
    );
  }

  // Validate max redemptions
  if (offer.maxRedemptions && offer.currentRedemptions >= offer.maxRedemptions) {
    throw new functions.https.HttpsError(
      'resource-exhausted',
      'Offer has reached maximum redemptions.'
    );
  }

  // Process redemption
  await offerRef.update({
    currentRedemptions: admin.firestore.FieldValue.increment(1),
  });

  // Update daily analytics
  const today = getTodayDateString();
  await db.doc(`restaurants/${restaurantId}/analytics/daily/${today}`).set(
    {
      offerRedemptions: admin.firestore.FieldValue.increment(1),
      date: today,
    },
    { merge: true }
  );

  // Update summary
  await db.doc(`restaurants/${restaurantId}/analytics/summary`).set(
    {
      totalOfferRedemptions: admin.firestore.FieldValue.increment(1),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Log to activity feed
  await db.collection(`restaurants/${restaurantId}/activity`).add({
    type: 'redemption',
    message: `"${offer.title}" offer redeemed${partySize ? ` by a group of ${partySize}` : ''}`,
    metadata: {
      offerId: offerDoc.id,
      offerTitle: offer.title,
      userId: context.auth.uid,
      partySize: partySize || null,
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    message: `Successfully redeemed "${offer.title}"`,
    offer: {
      title: offer.title,
      discountType: offer.discountType,
      discountValue: offer.discountValue,
    },
  };
});
