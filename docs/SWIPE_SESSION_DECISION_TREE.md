# Swipe Session Decision Tree

## Overview

This document describes the complete decision tree for a swiping session,
including venue fetching, coordinate shifting, empty states, and radius expansion.

---

## Venue Fetching Strategy

Google Places Nearby Search (New) returns max 20 results per call with NO pagination.
To get more venues, we use a **three-tier strategy**:

1. **Initial Fetch** — 20 venues from party center point
2. **Coordinate Shifting** — Shift search center in 20 positions (inner ring, outer ring, diagonal fill), each returning up to 20 new unique venues. De-duplicated against cache.
3. **Radius Expansion** — When all 20 shifts exhausted, prompt user to increase radius. Reset shifts and repeat.

**Theoretical max per radius:** ~420 unique venues (21 queries x 20, minus overlap)

### Coordinate Shift Pattern

```
Shift distances are proportional to party radius:
  Inner ring  (8 shifts): 40% of radius, 8 compass directions (N, NE, E, SE, S, SW, W, NW)
  Outer ring  (8 shifts): 75% of radius, 8 offset directions (NNE, ENE, ESE, SSE, SSW, WSW, WNW, NNW)
  Diagonal fill (4 shifts): 55% of radius, 4 intermediate angles

Example for 10mi radius:
  Inner: ~4mi shifts    (0.058° lat)
  Outer: ~7.5mi shifts  (0.109° lat)
  Diag:  ~5.5mi shifts  (0.080° lat)
```

---

## Phase 1: Session Initialization

```
Member taps "Start Swiping"
    |
    v
ensureSwipingStarted(partyId)
    |
    +--> Party status is 'lobby'?
    |       |
    |       YES --> Fetch 20 venues from center point
    |       |
    |       |   +--> API returns 0 venues?
    |       |   |       |
    |       |   |       YES --> ERROR: "No Restaurants Found"
    |       |   |               Show: sad emoji, message, "Go Home" button
    |       |   |               (This is the ONLY time this screen appears)
    |       |   |
    |       |   |       NO --> Cache venues in Firestore subcollection
    |       |   |              Set party.status = 'swiping'
    |       |   |              Set party.venuesFetched = count
    |       |   |              Set party.completedShifts = 0
    |       |   |              Set party.venuesExhausted = false
    |       |   |              Continue to Phase 2
    |       |
    |       NO --> Party already swiping, skip to Phase 2
    |
    v
Load unswiped venues (all cached venues minus user's swiped IDs)
Sort by priorityScore DESC (venues others liked appear first)
Begin showing cards
```

## Phase 2: Active Swiping

```
Member sees venue card
    |
    +--> Swipe LEFT (nope)
    |       |
    |       v
    |       Record swipe (direction: 'left')
    |       Increment swipeCount
    |       Refresh venue list --> Phase 3
    |
    +--> Swipe RIGHT (like)
            |
            v
            Record swipe (direction: 'right')
            Increment venue.priorityScore (+1)
            Increment swipeCount
            |
            +--> Check UNANIMOUS NOMINATION:
            |    Query all right-swipes for this venue
            |    Do ALL party members have a right-swipe on it?
            |       |
            |       YES --> WINNER! Set party.status = 'nominated'
            |               Set party.nominatedVenueId = venueId
            |               All members redirected to Success Screen
            |               "A Nom has been Nominated!" + venue details
            |       |
            |       NO --> Continue swiping
            |
            v
            Refresh venue list --> Phase 3
```

## Phase 3: Venue Replenishment (after each swipe)

```
refreshVenues()
    |
    v
Load unswiped venues from cache (sorted by priorityScore DESC)
    |
    +--> unswipedCount > LOW_THRESHOLD (5)?
    |       |
    |       YES --> Show next card, continue Phase 2
    |       |
    |       NO --> Need more venues. Try fetching:
    |               |
    |               v
    |           tryFetchMore()  (tries up to 3 consecutive shifts)
    |               |
    |               v
    |           fetchMoreVenues(partyId)
    |               |
    |               +--> completedShifts < 20?
    |               |       |
    |               |       YES --> Compute next shift offset
    |               |               Search at shifted lat/lng
    |               |               De-duplicate against cached venues
    |               |               Cache new unique venues
    |               |               Increment completedShifts
    |               |               |
    |               |               +--> Got new unique venues?
    |               |                       YES --> Reload unswiped, continue Phase 2
    |               |                       NO  --> Try next shift (up to 3 attempts)
    |               |       |
    |               |       NO --> All 20 shifts exhausted
    |               |              Set party.venuesExhausted = true
    |               |              Go to Phase 4
    |
    v
    unswipedCount === 0 AND venuesExhausted?
        |
        YES --> Phase 4: Radius Expansion Prompt
        |
        NO --> Show next card, continue Phase 2
```

## Phase 4: Radius Expansion

```
All 20 coordinate shifts exhausted for current radius
    |
    v
Show EXPAND RADIUS screen:
    "You've seen all [N] venues within [R] miles!"
    "Want to expand your search?"
    |
    +-- [10 mi]  [15 mi]  [25 mi]   (only show options > current radius)
    |
    +-- [Preview Results] button (always available)
    |
    v
Member selects new radius
    |
    v
expandRadius(partyId, newRadius)
    |
    v
Update party.radiusMiles = newRadius
Reset party.completedShifts = 0
Reset party.venuesExhausted = false
Fetch first batch at new radius (de-duplicated)
    |
    v
Got new venues? --> Continue Phase 2
No new venues? --> "No additional restaurants found."
                   (completedShifts still 0, shifts will try next)
```

## Phase 5: Progress & End Conditions

```
PROGRESS BAR (per member):
    swipeCount < 20  -->  Show progress bar: [swipeCount / 20]
    swipeCount >= 20 -->  Show: "Great job! Keep swiping or Preview Results"

END CONDITIONS (checked in this order):
    1. UNANIMOUS WIN (instant, any time):
       All members right-swiped the same venue
       --> Success Screen: "A Nom has been Nominated!"
       --> Shows venue name + unanimous badge

    2. FALLBACK NOMINATION (when ALL members hit 20 swipes):
       No unanimous match found
       --> Success Screen: "A Nom has been Nominated!"
       --> Shows top venue by vote count + "X of Y members liked this"

    3. VENUES EXHAUSTED + MAX RADIUS (after radius expansion declined):
       Member can still Preview Results at any time
```

## Empty State Decision Tree

```
venues.length === 0 AND venuesFetched === 0?
    --> "No Restaurants Found" (initial fetch failed)
    --> Show: Go Home button

venues.length === 0 AND venuesFetched > 0 AND NOT venuesExhausted?
    --> "Loading more venues..." (coordinate shift in progress)
    --> Show: spinner + Preview Results button

venues.length === 0 AND venuesFetched > 0 AND venuesExhausted?
    --> "You've seen all N venues within R miles!"
    --> Show: radius expansion buttons + Preview Results button
```

## State Diagram

```
    [lobby] ---(any member starts swiping)---> [swiping]
                                                   |
                            +----------------------+----------------------+
                            |                      |                      |
                    (unanimous match)     (all members 20+)      (venues exhausted)
                            |                      |                      |
                            v                      v                      v
                      [nominated]            [nominated]           [expand radius?]
                            |                      |                      |
                            v                      v               (yes)  |  (no)
                      [Success Screen]       [Success Screen]        |    v
                                                               [swiping] [Preview Results]
```

## Key Data Fields (Party Document)

| Field | Type | Description |
|-------|------|-------------|
| status | string | 'lobby' / 'swiping' / 'nominated' |
| venuesFetched | number | Total unique venues cached so far |
| venuesExhausted | boolean | True when all 20 shifts exhausted for current radius |
| completedShifts | number | How many coordinate shifts tried (0-20) |
| radiusMiles | number | Current search radius (5/10/15/25) |
| nominatedVenueId | string? | Winning venue ID |
| centerLat | number | Party center latitude (from zip code geocoding) |
| centerLng | number | Party center longitude |
