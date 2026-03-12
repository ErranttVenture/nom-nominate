/**
 * Firestore Database Schema Reference
 *
 * This file documents the Firestore collection structure.
 * It's not executed — it's a reference for developers.
 *
 * ├── users/
 * │   └── {userId}
 * │       ├── id: string
 * │       ├── phone: string
 * │       ├── displayName: string
 * │       ├── fcmToken: string
 * │       └── createdAt: Timestamp
 * │
 * ├── parties/
 * │   └── {partyId}
 * │       ├── id: string
 * │       ├── name: string
 * │       ├── zipCode: string
 * │       ├── centerLat: number
 * │       ├── centerLng: number
 * │       ├── radiusMiles: number (5 | 10 | 15 | 25)
 * │       ├── date?: string (ISO date)
 * │       ├── creatorId: string
 * │       ├── memberIds: string[]
 * │       ├── status: 'lobby' | 'swiping' | 'nominated' | 'results'
 * │       ├── nominatedVenueId?: string
 * │       ├── createdAt: Timestamp
 * │       ├── updatedAt: Timestamp
 * │       │
 * │       ├── members/ (subcollection)
 * │       │   └── {userId}
 * │       │       ├── userId: string
 * │       │       ├── displayName: string
 * │       │       ├── joinedAt: Timestamp
 * │       │       ├── status: 'invited' | 'joined' | 'swiping' | 'done'
 * │       │       └── swipeCount: number
 * │       │
 * │       ├── venues/ (subcollection — cached from Google Places)
 * │       │   └── {venueId}
 * │       │       ├── (all Venue fields)
 * │       │       └── priorityScore: number (incremented on right-swipes)
 * │       │
 * │       └── swipes/ (subcollection)
 * │           └── {swipeId}
 * │               ├── userId: string
 * │               ├── venueId: string
 * │               ├── direction: 'left' | 'right'
 * │               └── timestamp: Timestamp
 * │
 * └── offers/
 *     └── {offerId}
 *         ├── venueId: string (Google Places ID)
 *         ├── title: string
 *         ├── description: string
 *         ├── validUntil: Timestamp
 *         ├── isActive: boolean
 *         └── createdAt: Timestamp
 */

export {}; // make this a module
