import { useEffect, useState, useRef, useCallback } from 'react';
import { usePartyStore } from '@/stores/partyStore';
import { PartyService, SwipeService } from '@/lib/services';
import type { PartyStatus, Venue } from '@/types';

const QUEUE_CAPACITY = 3; // Pre-validate this many venues ahead
const LOW_POOL_THRESHOLD = 5; // Fetch more when pool drops below this

/**
 * Manages the swipe session with a ref-based venue queue.
 *
 * The queue lives in a useRef (source of truth) so it's never stale.
 * Only `currentVenue` and `nextVenue` are React state (what the UI renders).
 * `advanceQueue` is 100% synchronous — no async wait, no race conditions.
 * Async refilling only ever appends to the back of the queue.
 */
export function useSwipeSession(partyId: string) {
  const [loading, setLoading] = useState(true);
  const [partyStatus, setPartyStatus] = useState<PartyStatus>('swiping');
  const [nominatedVenueId, setNominatedVenueId] = useState<string | undefined>();
  const [venuesExhausted, setVenuesExhausted] = useState(false);
  const [venuesFetched, setVenuesFetched] = useState(0);

  // ── Queue (ref = source of truth, state = what UI renders) ──
  const queueRef = useRef<Venue[]>([]);
  const [currentVenue, setCurrentVenue] = useState<Venue | null>(null);
  const [nextVenue, setNextVenue] = useState<Venue | null>(null);

  // ── De-dup trackers ──
  const seenVenueIds = useRef(new Set<string>());
  const seenVenueNames = useRef(new Set<string>());

  // ── Locks ──
  const refillLock = useRef(false);
  const fetchingMore = useRef(false);

  const setCurrentParty = usePartyStore((s) => s.setCurrentParty);

  /**
   * Push queueRef[0] and [1] into React state so the UI updates.
   * This is the ONLY way currentVenue/nextVenue get set.
   */
  const syncDisplayFromRef = useCallback(() => {
    const q = queueRef.current;
    setCurrentVenue(q[0] ?? null);
    setNextVenue(q[1] ?? null);
  }, []);

  /**
   * Load the full unswiped pool from Firestore, filtered by all seen sets.
   */
  const loadPool = useCallback(async () => {
    const allVenues = await PartyService.getPartyVenues(partyId);
    const swipedIds = await SwipeService.getUserSwipedVenueIds(partyId);

    const pool = allVenues.filter((v) => {
      if (swipedIds.has(v.id)) return false;
      if (seenVenueIds.current.has(v.id)) return false;
      if (seenVenueNames.current.has(v.name.trim().toLowerCase())) return false;
      return true;
    });

    console.log('[SwipeSession] Pool:', allVenues.length, 'total,', pool.length, 'available,', seenVenueIds.current.size, 'seen');
    return pool;
  }, [partyId]);

  /**
   * Try to fetch more venues from Google when pool runs low.
   */
  const tryFetchMore = useCallback(async (): Promise<boolean> => {
    if (fetchingMore.current) return false;
    fetchingMore.current = true;

    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const added = await PartyService.fetchMoreVenues(partyId);
        if (added > 0) return true;

        const party = await PartyService.getParty(partyId);
        if (party?.venuesExhausted) {
          setVenuesExhausted(true);
          return false;
        }
      }
      return false;
    } catch (err) {
      console.error('[SwipeSession] Failed to fetch more venues:', err);
      return false;
    } finally {
      fetchingMore.current = false;
    }
  }, [partyId]);

  /**
   * Refill the back of the queue if it's below capacity.
   * Guarded by refillLock to prevent concurrent refills.
   * NEVER changes positions 0 or 1 if they already exist — only appends.
   */
  const refillIfNeeded = useCallback(async () => {
    if (refillLock.current) return;
    if (queueRef.current.length >= QUEUE_CAPACITY) return;

    refillLock.current = true;

    try {
      let pool = await loadPool();

      // Exclude venues already in the queue (by ID and name)
      const queueIds = new Set(queueRef.current.map((v) => v.id));
      const queueNames = new Set(queueRef.current.map((v) => v.name.trim().toLowerCase()));
      pool = pool.filter(
        (v) => !queueIds.has(v.id) && !queueNames.has(v.name.trim().toLowerCase())
      );

      // Append what we need to fill to capacity
      const needed = QUEUE_CAPACITY - queueRef.current.length;
      if (needed > 0 && pool.length > 0) {
        const newEntries = pool.slice(0, needed);
        queueRef.current = [...queueRef.current, ...newEntries];
        syncDisplayFromRef();
      }

      // If pool is running low, fetch more from Google then try refilling again
      const remainingPool = pool.length - (needed > 0 ? Math.min(needed, pool.length) : 0);
      if (remainingPool <= LOW_POOL_THRESHOLD && !venuesExhausted) {
        const gotMore = await tryFetchMore();
        if (gotMore && queueRef.current.length < QUEUE_CAPACITY) {
          // Recurse once to fill from the newly fetched venues
          refillLock.current = false;
          await refillIfNeeded();
          return; // refillLock handled by recursive call
        }
      }
    } catch (err) {
      console.error('[SwipeSession] Refill error:', err);
    } finally {
      refillLock.current = false;
    }
  }, [loadPool, tryFetchMore, venuesExhausted, syncDisplayFromRef]);

  // ── Initial load ──────────────────────────────────────────────
  useEffect(() => {
    if (!partyId) return;

    let isMounted = true;

    // Reset state for new session
    usePartyStore.setState({ swipeCount: 0 });
    seenVenueIds.current = new Set<string>();
    seenVenueNames.current = new Set<string>();
    queueRef.current = [];

    const initSession = async () => {
      try {
        await PartyService.ensureSwipingStarted(partyId);

        // Load initial pool and fill queue
        const allVenues = await PartyService.getPartyVenues(partyId);
        const swipedIds = await SwipeService.getUserSwipedVenueIds(partyId);

        const pool = allVenues.filter((v) => {
          if (swipedIds.has(v.id)) return false;
          return true;
        });

        const initialQueue = pool.slice(0, QUEUE_CAPACITY);
        queueRef.current = initialQueue;

        if (isMounted) {
          syncDisplayFromRef();
          setLoading(false);
        }

        // Kick off background refill if pool is low
        if (pool.length <= LOW_POOL_THRESHOLD) {
          tryFetchMore();
        }
      } catch (error) {
        console.error('Failed to init swipe session:', error);
        if (isMounted) setLoading(false);
      }
    };

    initSession();

    // Subscribe to party status changes (for nomination detection)
    const unsubParty = PartyService.onPartySnapshot(partyId, (party) => {
      if (isMounted) {
        setCurrentParty(party);
        setPartyStatus(party.status);
        setNominatedVenueId(party.nominatedVenueId);
        setVenuesExhausted(party.venuesExhausted ?? false);
        setVenuesFetched(party.venuesFetched ?? 0);
      }
    });

    return () => {
      isMounted = false;
      unsubParty();
    };
  }, [partyId]);

  /**
   * Advance the queue after a swipe.
   * 100% SYNCHRONOUS — mutates ref + updates display state in one tick.
   * Async refill fires in the background but can never change what's displayed.
   */
  const advanceQueue = useCallback(() => {
    const q = queueRef.current;
    if (q.length === 0) return;

    // Mark front venue as seen (both ID and name)
    const swiped = q[0];
    seenVenueIds.current.add(swiped.id);
    seenVenueNames.current.add(swiped.name.trim().toLowerCase());

    // Shift front off — mutate ref directly
    queueRef.current = q.slice(1);

    // Update UI immediately (synchronous)
    syncDisplayFromRef();

    // Refill the back of the queue in the background (fire-and-forget)
    refillIfNeeded();
  }, [syncDisplayFromRef, refillIfNeeded]);

  return {
    loading,
    partyStatus,
    nominatedVenueId,
    venuesExhausted,
    venuesFetched,
    currentVenue,
    nextVenue,
    advanceQueue,
  };
}
