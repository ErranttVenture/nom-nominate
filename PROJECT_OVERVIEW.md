# Nom Nominate -- Technical Project Overview

> Reference document for AI agents and developers working on this project.
> Last updated: 2026-03-19

---

## 1. Project Summary

**Nom Nominate** is a mobile app that helps groups of friends decide where to eat. Users create a "party," invite friends via deep link, and everyone swipes right/left on nearby restaurants (Tinder-style). The app tallies votes and nominates a winner. There is also a solo mode for individual browsing.

- **Package name:** `nom-nominate`
- **Bundle ID (Android + iOS):** `com.nomnominate.app`
- **Expo slug:** `nom-nominate`
- **Expo owner:** `errantventure`
- **Current version:** 1.1.0
- **Current Android versionCode:** 29
- **EAS Project ID:** `e933dfe6-278a-4280-af27-3f928dc61b1f`

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Language | TypeScript | ~5.9.2 |
| Runtime | React Native | 0.83.2 |
| Framework | Expo (managed workflow via prebuild) | SDK 55 |
| UI library | React | 19.2.0 |
| Navigation | Expo Router (file-based) | ~55.0.0 |
| State management | Zustand | ^5.0.0 |
| Backend | Firebase (Firestore, Auth, Cloud Functions, Hosting) | @react-native-firebase v23.8.8 |
| Animations | React Native Reanimated 4.2.1, Gesture Handler ~2.30.0 |
| Build system | EAS Build (CLI >= 12.0.0) | |

---

## 3. Dependencies

### Production Dependencies

| Package | Purpose |
|---|---|
| `expo` (~55.0.0) | Core Expo SDK |
| `expo-router` (~55.0.0) | File-based navigation (replaces React Navigation stack manually) |
| `expo-asset` (~55.0.0) | Static asset bundling |
| `expo-constants` (~55.0.0) | Access app manifest/config values |
| `expo-haptics` (~55.0.0) | Haptic feedback on swipe actions |
| `expo-linking` (~55.0.0) | Deep link handling |
| `expo-sharing` (~55.0.0) | Native share sheet for invite links |
| `expo-status-bar` (~55.0.0) | Status bar styling |
| `@expo/metro-runtime` (~55.0.6) | Metro bundler runtime for Expo |
| `@react-native-firebase/app` (^23.8.8) | Firebase core (native module) |
| `@react-native-firebase/auth` (^23.8.8) | Firebase Phone Auth |
| `@react-native-firebase/firestore` (^23.8.8) | Firestore database |
| `@react-native-firebase/messaging` (^23.8.8) | FCM push notifications |
| `@react-native-async-storage/async-storage` (2.2.0) | Persistent key-value storage |
| `react-native-gesture-handler` (~2.30.0) | Gesture detection for swipe cards |
| `react-native-reanimated` (4.2.1) | 60fps animations for card stack |
| `react-native-worklets` (0.7.2) | Worklet threading for Reanimated |
| `react-native-safe-area-context` (~5.6.2) | Safe area insets |
| `react-native-screens` (~4.23.0) | Native screen containers |
| `react-native-web` (^0.21.0) | Web target support |
| `react-dom` (19.2.0) | Web rendering |
| `zustand` (^5.0.0) | Lightweight state management |

### Dev Dependencies

| Package | Purpose |
|---|---|
| `typescript` (~5.9.2) | Type checking |
| `@types/react` (~19.2.10) | React type definitions |
| `babel-plugin-module-resolver` (^5.0.0) | Path alias `@/` resolution in Babel |

---

## 4. Project Structure

```
app-scaffold/
|-- app/                          # Expo Router screens (file-based routing)
|   |-- _layout.tsx               # Root Stack navigator, auth listener init
|   |-- index.tsx                 # Entry redirect (auth gate)
|   |-- auth.tsx                  # Phone auth screen (SMS verification)
|   |-- tutorial.tsx              # First-time user tutorial
|   |-- (tabs)/                   # Bottom tab navigator group
|   |   |-- _layout.tsx           # Tab bar config (Home, History, Settings)
|   |   |-- index.tsx             # Home tab -- active parties, create/join
|   |   |-- history.tsx           # Past parties and results
|   |   |-- settings.tsx          # User settings, sign out
|   |-- party/
|   |   |-- create.tsx            # Create party form (name, zip, radius, date)
|   |   |-- [id].tsx              # Party lobby (waiting room, member list)
|   |   |-- swipe.tsx             # Swiping session (card stack)
|   |   |-- success.tsx           # Nomination success celebration
|   |   |-- results.tsx           # Vote results breakdown
|   |-- solo/
|       |-- index.tsx             # Solo mode setup (zip, radius)
|       |-- browse.tsx            # Solo swiping (no party, save favorites)
|       |-- results.tsx           # Solo favorites list
|
|-- src/                          # Application source code
|   |-- components/
|   |   |-- cards/
|   |   |   |-- CardStack.tsx     # Animated swipe card stack (Reanimated + Gesture Handler)
|   |   |   |-- VenueCard.tsx     # Individual venue card (photo, name, cuisine, rating, price)
|   |   |-- party/
|   |       |-- PartyListCard.tsx # Party preview card for home/history lists
|   |
|   |-- constants/
|   |   |-- index.ts              # Colors, party config (min members, radius options, thresholds)
|   |
|   |-- hooks/
|   |   |-- useAuth.ts            # Firebase onAuthStateChanged listener -> Zustand sync
|   |   |-- useNominatedVenue.ts  # Fetch winning venue details
|   |   |-- useParties.ts         # Load user's active/past parties
|   |   |-- usePartyLobby.ts      # Real-time lobby state (members, party status)
|   |   |-- usePushNotifications.ts # FCM token registration and permission
|   |   |-- useResults.ts         # Fetch vote tallies
|   |   |-- useSwipeSession.ts    # Load venues, filter swiped, subscribe to party changes
|   |
|   |-- lib/
|   |   |-- api/
|   |   |   |-- places.ts         # Google Places API (New) -- searchNearby for restaurants
|   |   |   |-- geocoding.ts      # Google Geocoding API -- zip code to lat/lng
|   |   |-- firebase/
|   |   |   |-- config.ts         # Firebase web config, collection name constants
|   |   |   |-- auth.ts           # Phone auth: send code, confirm code, user profile CRUD
|   |   |   |-- parties.ts        # Party CRUD, venue fetching, real-time listeners
|   |   |   |-- swipes.ts         # Record swipes, vote tallying, auto-nomination logic
|   |   |   |-- firestore-schema.ts # Database schema reference (documentation-only file)
|   |   |-- mock/
|   |   |   |-- data.ts           # Mock venue/party data for offline development
|   |   |   |-- services.ts       # Mock service implementations
|   |   |-- services.ts           # Service abstraction layer (toggle USE_MOCK for mock vs real)
|   |
|   |-- stores/
|   |   |-- authStore.ts          # Zustand: user, isAuthenticated, isVerifying, pendingPartyId
|   |   |-- partyStore.ts         # Zustand: currentParty, members, venues, swipeIndex, results, soloFavorites
|   |
|   |-- types/
|       |-- index.ts              # TypeScript interfaces: User, Party, Venue, Swipe, VenueVotes, etc.
|
|-- hosting/                      # Firebase Hosting static files
|   |-- index.html                # Landing page (not currently used)
|   |-- party/
|   |   |-- index.html            # Deep link landing page -- "Open in App" with intent:// fallback
|   |-- .well-known/
|       |-- assetlinks.json       # Android App Links verification (Digital Asset Links)
|
|-- functions/                    # Firebase Cloud Functions (Node.js)
|   |-- src/                      # Function source code
|   |-- package.json              # Function dependencies
|   |-- tsconfig.json             # Function TypeScript config
|
|-- google-services.json          # Android Firebase config (API keys, OAuth client, package info)
|-- firebase.json                 # Firebase project config (Firestore rules, hosting, emulators)
|-- firestore.rules               # Firestore security rules
|-- firestore.indexes.json        # Firestore composite indexes
|-- app.json                      # Expo app config (name, scheme, plugins, intent filters)
|-- eas.json                      # EAS Build profiles (development, preview, production)
|-- tsconfig.json                 # TypeScript config (strict, path alias @/ -> src/)
|-- package.json                  # Dependencies and scripts
```

---

## 5. Firebase Configuration

### Project Details

| Property | Value |
|---|---|
| Project ID | `nom-nominate` |
| Project Number | `964967620859` |
| Auth Domain | `nom-nominate.firebaseapp.com` |
| Storage Bucket | `nom-nominate.firebasestorage.app` |
| Hosting URL | `https://nom-nominate.web.app` |
| Web App ID | See `EXPO_PUBLIC_FIREBASE_APP_ID` in `.env` |
| Android App ID | See `google-services.json` |

### Firestore Database Schema

```
/users/{userId}
    id: string
    phone: string
    displayName: string
    fcmToken: string
    createdAt: Timestamp

/parties/{partyId}
    id: string
    name: string
    zipCode: string
    centerLat: number
    centerLng: number
    radiusMiles: number (5 | 10 | 15 | 25)
    date?: string (ISO date)
    creatorId: string
    memberIds: string[]
    status: 'lobby' | 'swiping' | 'nominated' | 'results'
    nominatedVenueId?: string
    createdAt: Timestamp
    updatedAt: Timestamp

    /parties/{partyId}/members/{userId}
        userId: string
        displayName: string
        joinedAt: Timestamp
        status: 'declined' | 'invited' | 'joined' | 'swiping' | 'done'
        swipeCount: number

    /parties/{partyId}/venues/{venueId}
        (all Venue fields -- cached from Google Places)
        priorityScore: number (incremented on right-swipes)

    /parties/{partyId}/swipes/{swipeId}
        userId: string
        venueId: string
        direction: 'left' | 'right'
        timestamp: Timestamp

/offers/{offerId}
    venueId: string (Google Places ID)
    title: string
    description: string
    validUntil: Timestamp
    isActive: boolean
    createdAt: Timestamp
```

### Collection Name Constants (from `src/lib/firebase/config.ts`)

```typescript
COLLECTIONS.USERS = 'users'
COLLECTIONS.PARTIES = 'parties'
COLLECTIONS.PARTY_MEMBERS = 'members'    // subcollection of parties
COLLECTIONS.SWIPES = 'swipes'            // subcollection of parties
COLLECTIONS.VENUES = 'venues'            // subcollection of parties
COLLECTIONS.OFFERS = 'offers'
```

### Firestore Security Rules Summary

- **users/{userId}**: Any authenticated user can read; only the owner can write.
- **parties/{partyId}**: Only members (listed in `memberIds`) can read; any authenticated user can create; members can update.
  - **members subcollection**: Any authenticated user can read/write.
  - **venues subcollection**: Any authenticated user can read; only Cloud Functions write.
  - **swipes subcollection**: Any authenticated user can read; users can only create swipes where `userId == auth.uid`.
- **offers/{offerId}**: Any authenticated user can read.

### Firebase Emulator Ports

| Service | Port |
|---|---|
| Auth | 9099 |
| Functions | 5001 |
| Firestore | 8080 |
| Hosting | 5002 |
| Emulator UI | Auto-assigned |

---

## 6. API Integrations

### Google Places API (New)

- **Endpoint:** `https://places.googleapis.com/v1/places:searchNearby` (POST)
- **API Key:** Uses `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` env var, passed via `X-Goog-Api-Key` header
- **Included types:** `restaurant`, `bar`, `cafe`
- **Max results per request:** 20
- **Fields requested:** `id`, `displayName`, `primaryType`, `rating`, `priceLevel`, `photos`, `location`, `formattedAddress`, `currentOpeningHours`, `regularOpeningHours`
- **Photo URLs:** Constructed as `https://places.googleapis.com/v1/{photoName}/media?maxHeightPx=400&maxWidthPx=400&key={API_KEY}`
- **Source file:** `src/lib/api/places.ts`

### Google Geocoding API

- **Endpoint:** `https://maps.googleapis.com/maps/api/geocode/json`
- **API Key:** Same `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` env var
- **Purpose:** Convert US zip codes to lat/lng coordinates for venue search center point
- **Component restriction:** `country:US`
- **Source file:** `src/lib/api/geocoding.ts`

### API Key Notes

Both APIs use the same key, stored in the `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` environment variable. This key must have the following APIs enabled in Google Cloud Console:
- Places API (New)
- Geocoding API

The Android API key (from `google-services.json`) is separate and is used by Firebase native SDKs on Android.

> **Setup:** Copy `.env.example` to `.env` and fill in your real API keys. See `.env.example` for all required variables.

---

## 7. Authentication Flow

Authentication uses **Firebase Phone Auth** with SMS verification.

### Flow Steps

1. User enters phone number on `app/auth.tsx`
2. App calls `sendVerificationCode(phoneNumber, onAutoVerify)` from `src/lib/firebase/auth.ts`
3. **On Android:** Uses `auth().verifyPhoneNumber()` with state machine:
   - `CODE_SENT` -> Promise resolves, show code entry screen
   - `AUTO_VERIFIED` -> Android auto-read the SMS, signs in automatically via callback
   - `AUTO_VERIFY_TIMEOUT` -> Fall through to manual code entry
   - `ERROR` -> Show error to user
4. **On iOS:** Uses `auth().signInWithPhoneNumber()` directly
5. User enters 6-digit code -> `confirmVerificationCode(verificationId, code)`
6. On success, `ensureUserProfile()` creates a Firestore `/users/{uid}` document if new
7. `useAuthListener` hook (in root layout) picks up `onAuthStateChanged` and syncs to `authStore`
8. If `isNewUser`, user is prompted to set a display name via `updateUserProfile()`

### Key Auth State (Zustand `authStore`)

- `user: User | null` -- current user
- `isAuthenticated: boolean` -- derived from user presence
- `isVerifying: boolean` -- suppresses auto-navigation during verification (prevents Android auto-verify race condition)
- `pendingPartyId: string | null` -- deep link party ID captured before auth, navigated to after auth completes

### Android Play Integrity

Firebase Phone Auth on Android requires **Play Integrity** (formerly SafetyNet). This is configured via:
- SHA-1 fingerprint registered in Firebase Console (current: `c9b8089c1383106c134625e23b948dcf4b6b2408` from `google-services.json`)
- SHA-256 fingerprint for App Links: `F2:CB:6D:E1:73:3C:31:C2:1E:E3:61:A3:E6:78:49:59:D2:BB:34:BD:13:A8:49:87:D7:A7:F1:2E:DD:45:62:B5`
- OAuth client ID: `964967620859-acoqthpi2kaamr5otd0kn9jfjsse3neg.apps.googleusercontent.com`

**Important:** When building with EAS, the upload key SHA fingerprints differ from the locally generated debug key. Both must be registered in Firebase Console for phone auth to work in both development and production builds.

---

## 8. Navigation Structure

Expo Router file-based routing. All screens are in the `app/` directory.

### Screen Map

```
/ (index.tsx)                     -> Auth gate: redirects to /auth or /(tabs)

/auth                             -> Phone number + SMS code verification

/(tabs)/                          -> Bottom tab navigator
  /(tabs)/index                   -> Home: active parties list, create/join buttons
  /(tabs)/history                 -> Past parties with results
  /(tabs)/settings                -> Profile, sign out

/party/create                     -> Modal: create party form (name, zip, radius, date)
/party/[id]                       -> Party lobby: member list, waiting, start swiping
/party/swipe                      -> Card stack swiping session
/party/success                    -> Full-screen nomination celebration
/party/results                    -> Vote breakdown with percentages

/solo/index                       -> Modal: solo mode setup (zip, radius)
/solo/browse                      -> Solo swiping (save favorites)
/solo/results                     -> Solo favorites list

/tutorial                         -> First-time tutorial walkthrough
```

### Screen Presentation Modes

| Screen | Presentation |
|---|---|
| `party/create` | Modal (slide from bottom) |
| `party/success` | Full-screen modal (gesture disabled) |
| `solo/index` | Modal (slide from bottom) |
| All others | Default (slide from right) |

---

## 9. State Management

Two Zustand stores handle all client-side state.

### `authStore` (`src/stores/authStore.ts`)

| Field | Type | Purpose |
|---|---|---|
| `user` | `User \| null` | Current authenticated user |
| `isLoading` | `boolean` | Initial auth state loading |
| `isAuthenticated` | `boolean` | Derived from user presence |
| `isVerifying` | `boolean` | Suppresses navigation during phone verification |
| `pendingPartyId` | `string \| null` | Deep link party ID queued before auth |

### `partyStore` (`src/stores/partyStore.ts`)

| Field | Type | Purpose |
|---|---|---|
| `currentParty` | `Party \| null` | Active party being viewed/swiped |
| `members` | `PartyMember[]` | Current party's member list |
| `venues` | `Venue[]` | Venues loaded for swiping (filtered to unswiped) |
| `currentVenueIndex` | `number` | Index of the card currently on top |
| `swipeCount` | `number` | Number of swipes in current session |
| `results` | `VenueVotes[]` | Vote tallies for results screen |
| `soloFavorites` | `Venue[]` | Solo mode right-swiped venues |
| `activeParties` | `Party[]` | User's parties in lobby/swiping status |
| `pastParties` | `Party[]` | User's parties in nominated/results status |

---

## 10. Deep Linking Configuration

### Custom Scheme

- **Scheme:** `nomnominate://`
- **Configured in:** `app.json` -> `expo.scheme`
- **Example:** `nomnominate://party/{partyId}`

### Android App Links (HTTPS)

- **Host:** `nom-nominate.web.app`
- **Path prefix:** `/party`
- **Full pattern:** `https://nom-nominate.web.app/party/{partyId}`
- **Auto-verify:** `true` (configured in `app.json` -> `android.intentFilters`)

### Digital Asset Links (`assetlinks.json`)

Hosted at `https://nom-nominate.web.app/.well-known/assetlinks.json`:
- **Package:** `com.nomnominate.app`
- **SHA-256 fingerprint:** `F2:CB:6D:E1:73:3C:31:C2:1E:E3:61:A3:E6:78:49:59:D2:BB:34:BD:13:A8:49:87:D7:A7:F1:2E:DD:45:62:B5`
- **Relation:** `delegate_permission/common.handle_all_urls`

### Deep Link Landing Page

The web page at `/party/index.html` serves as a fallback for users who do not have the app installed:
- Shows "Open in App" button
- On Android: uses `intent://` scheme with Play Store fallback
- On iOS: uses `nomnominate://` custom scheme
- Auto-attempts to open the app on mobile after 800ms
- Includes Open Graph and Twitter Card meta tags for rich link previews

### Firebase Hosting Rewrite

All requests to `/party/**` are rewritten to `/party/index.html` (configured in `firebase.json`).

---

## 11. Build and Deployment

### EAS Build Profiles (`eas.json`)

| Profile | Purpose | Distribution | Auto-increment |
|---|---|---|---|
| `development` | Dev client with hot reload | Internal | No |
| `preview` | Internal testing APK/IPA | Internal | No |
| `production` | Google Play / App Store release | Store | Yes (versionCode) |

### Build Commands

```bash
# Development build (installs dev client on device/emulator)
eas build --profile development --platform android

# Preview build (internal testing)
eas build --profile preview --platform android

# Production build (Play Store)
eas build --profile production --platform android

# Submit to Google Play internal track
eas submit --platform android --profile production
```

### Environment Variables Required

| Variable | Where | Purpose |
|---|---|---|
| `EXPO_TOKEN` | EAS CI/local | Authenticates EAS CLI with Expo account |

### Firebase Deployment

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Cloud Functions
firebase deploy --only functions

# Deploy Hosting (landing page + assetlinks.json)
firebase deploy --only hosting

# Deploy everything
firebase deploy
```

### Google Play Console

- **Track:** Internal testing (configured in `eas.json` -> `submit.production.android.track`)
- **Service account key:** `google-services.json` (used by EAS Submit for upload)
- **Package:** `com.nomnominate.app`

---

## 12. Key File Paths for Common Tasks

| Task | File(s) |
|---|---|
| Add a new screen | `app-scaffold/app/{screenName}.tsx` |
| Modify tab bar | `app-scaffold/app/(tabs)/_layout.tsx` |
| Change app colors/theme | `app-scaffold/src/constants/index.ts` |
| Edit Firestore queries | `app-scaffold/src/lib/firebase/parties.ts`, `swipes.ts` |
| Edit auth flow | `app-scaffold/src/lib/firebase/auth.ts`, `app/auth.tsx` |
| Change venue search params | `app-scaffold/src/lib/api/places.ts` |
| Modify swipe card UI | `app-scaffold/src/components/cards/VenueCard.tsx`, `CardStack.tsx` |
| Update Firestore rules | `app-scaffold/firestore.rules` |
| Add a new Zustand state field | `app-scaffold/src/stores/authStore.ts` or `partyStore.ts` |
| Edit TypeScript types | `app-scaffold/src/types/index.ts` |
| Toggle mock/real backend | `app-scaffold/src/lib/services.ts` (set `USE_MOCK`) |
| Update deep link config | `app-scaffold/app.json` (intentFilters), `hosting/.well-known/assetlinks.json` |
| Change Expo plugins | `app-scaffold/app.json` -> `expo.plugins` |
| Update EAS build config | `app-scaffold/eas.json` |
| Firebase project config | `app-scaffold/firebase.json` |
| Cloud Functions code | `app-scaffold/functions/src/` |

---

## 13. App Constants and Configuration

### Colors (`src/constants/index.ts`)

| Name | Hex | Usage |
|---|---|---|
| `primary` | `#FF6B35` | Buttons, accents, branding |
| `primaryDark` | `#E55A2B` | Pressed states |
| `success` | `#2ECC71` | Right-swipe, positive actions |
| `danger` | `#E74C3C` | Left-swipe, destructive actions |
| `dark` | `#1a1a2e` | Dark backgrounds, splash |
| `darker` | `#16213e` | Darker background variant |
| `text` | `#2d3436` | Primary text |
| `textLight` | `#636e72` | Secondary text |
| `background` | `#f8f9fa` | Screen background |
| `card` | `#ffffff` | Card surfaces |
| `border` | `#e9ecef` | Borders and dividers |
| `offer` | `#f0932b` | Sponsored offer accent |

### Party Constants

| Constant | Value | Purpose |
|---|---|---|
| `PARTY.MIN_MEMBERS` | 2 | Minimum members to start swiping |
| `PARTY.LARGE_GROUP_THRESHOLD` | 10 | Groups >= 10 use different vote threshold |
| `PARTY.LARGE_GROUP_VOTE_PERCENT` | 0.8 | 80% agreement needed for large groups |
| `PARTY.MIN_SWIPES_FOR_FALLBACK` | 20 | Minimum swipes before fallback nomination |
| `PARTY.DEFAULT_RADIUS_MILES` | 10 | Default search radius |
| `PARTY.RADIUS_OPTIONS` | [5, 10, 15, 25] | Available radius choices |
| `MILES_TO_METERS` | 1609.34 | Conversion constant |

---

## 14. TypeScript Configuration

- **Base config:** Extends `expo/tsconfig.base`
- **Strict mode:** Enabled
- **Path alias:** `@/*` maps to `src/*`
- **Path alias in Babel:** Handled by `babel-plugin-module-resolver`

---

## 15. Known Configuration Requirements

### SHA Fingerprints

Both SHA-1 and SHA-256 fingerprints must be registered in Firebase Console for:
1. **Phone Auth (Play Integrity):** Requires the signing key SHA-1.
2. **App Links verification:** Requires the signing key SHA-256 in `assetlinks.json`.

When using EAS Build, Google Play App Signing generates a different upload key. Both the EAS-generated upload key AND the Google Play signing key fingerprints must be registered. To find the Google Play signing key fingerprint:
- Google Play Console -> Your App -> Setup -> App signing

### OAuth Client

The OAuth client in `google-services.json` (`964967620859-acoqthpi2kaamr5otd0kn9jfjsse3neg.apps.googleusercontent.com`) must have the correct SHA-1 fingerprint for the signing key being used.

### Test Phone Numbers

For development/testing without actually sending SMS, add test phone numbers in Firebase Console:
- Firebase Console -> Authentication -> Sign-in method -> Phone -> Phone numbers for testing
- Test numbers bypass SMS sending and rate limiting

### Google Cloud APIs

The following APIs must be enabled in the Google Cloud project (`nom-nominate`):
- Places API (New)
- Geocoding API
- Firebase Auth API
- Cloud Firestore API
- Firebase Cloud Messaging API

---

## 16. Emulator Testing Setup

### Running Two Android Emulators Simultaneously

To test the multiplayer party flow, you need two emulators:

```bash
# List available AVDs
emulator -list-avds

# Start first emulator
emulator -avd Pixel_7_API_34 &

# Start second emulator with a different port
emulator -avd Pixel_7_API_34_2 -port 5556 &
```

### ADB Commands for Multi-Device

```bash
# List connected devices
adb devices

# Install APK on specific device
adb -s emulator-5554 install app.apk
adb -s emulator-5556 install app.apk

# Open deep link on specific emulator
adb -s emulator-5554 shell am start -a android.intent.action.VIEW -d "nomnominate://party/PARTY_ID"
adb -s emulator-5556 shell am start -a android.intent.action.VIEW -d "nomnominate://party/PARTY_ID"

# View logs for specific device
adb -s emulator-5554 logcat -s ReactNativeJS
```

### Installing AAB Files (from EAS Build) on Emulators

EAS production builds output `.aab` files. To install on an emulator, convert to APK first using `bundletool`:

```bash
# Download bundletool if not already installed
# https://github.com/google/bundletool/releases

# Convert AAB to APK set
java -jar bundletool.jar build-apks \
  --bundle=app.aab \
  --output=app.apks \
  --mode=universal

# Install the universal APK
java -jar bundletool.jar install-apks --apks=app.apks --device-id=emulator-5554
```

### Development Build on Emulator

```bash
# Build dev client
eas build --profile development --platform android

# After install, start the bundler
npx expo start --dev-client
```

### Firebase Emulator Suite

```bash
# Start all Firebase emulators
firebase emulators:start

# Emulator UI will be available at the auto-assigned port
# Auth: http://localhost:9099
# Firestore: http://localhost:8080
# Functions: http://localhost:5001
# Hosting: http://localhost:5002
```

---

## 17. Service Abstraction Layer

The app uses a service abstraction (`src/lib/services.ts`) that sits between UI hooks and Firebase. This allows toggling between real Firebase and mock data:

```typescript
export const USE_MOCK = false; // Set to true for offline development
```

Services exposed:
- **AuthService** -- sendVerificationCode, confirmVerificationCode, updateUserProfile, signOut
- **PartyService** -- createParty, joinParty, getParty, getUserParties, getPartyMembers, getPartyVenues, startSwipingSession, onPartySnapshot, onMembersSnapshot, updatePartyRadius
- **SwipeService** -- recordSwipe, getUserSwipedVenueIds, getVoteResults, markDoneAndCheckNomination
- **GeoService** -- geocodeZipCode

---

## 18. Core Game Logic

### Party Lifecycle

```
lobby -> swiping -> nominated -> results
```

1. **Lobby:** Creator creates party, shares invite link. Members join via deep link. Creator starts swiping when ready (min 2 members).
2. **Swiping:** Venues are fetched from Google Places and cached in Firestore subcollection. Each member swipes independently. Right-swipes boost venue `priorityScore`.
3. **Nominated:** When all members mark "done," `markDoneAndCheckNomination()` auto-calculates votes and sets the top venue as `nominatedVenueId`. Party status becomes `nominated`.
4. **Results:** Vote breakdown is available showing each venue's right-swipe percentage.

### Vote Calculation

- Each venue gets a count of unique users who right-swiped it
- Percentage = (unique right-swipers / total members) * 100
- Winner = highest percentage, ties broken by raw right-swipe count
- For large groups (>= 10 members), an 80% agreement threshold applies

---

## 19. NPM Scripts

```bash
npm start          # expo start (dev server)
npm run android    # expo start --android
npm run ios        # expo start --ios
npm run web        # expo start --web
npm run lint       # eslint . --ext .ts,.tsx
npm run typecheck  # tsc --noEmit
```
