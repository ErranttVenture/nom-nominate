# Nom Nominate — Setup Guide

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Firebase CLI: `npm install -g firebase-tools`
- Xcode 15+ (for iOS)
- Android Studio (for Android)

## Step 1: Install Dependencies

```bash
cd app-scaffold
npm install

cd functions
npm install
cd ..
```

## Step 2: Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project called "nom-nominate"
3. Enable these services:
   - **Authentication** → Enable "Phone" sign-in provider
   - **Cloud Firestore** → Create database (start in test mode, deploy rules later)
   - **Cloud Functions** → Requires Blaze (pay-as-you-go) plan
   - **Cloud Messaging** → Enabled by default

4. Add apps:
   - **iOS**: Bundle ID `com.nomnominate.app` → Download `GoogleService-Info.plist`
   - **Android**: Package `com.nomnominate.app` → Download `google-services.json`

5. Place config files:
   - `GoogleService-Info.plist` → project root
   - `google-services.json` → project root

6. Update `src/lib/firebase/config.ts` with your project values

## Step 3: Google Places API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable these APIs:
   - **Places API (New)**
   - **Geocoding API**
3. Create an API key with these restrictions:
   - Application restriction: iOS/Android apps
   - API restriction: Places API, Geocoding API
4. Update API keys in:
   - `src/lib/api/places.ts`
   - `src/lib/api/geocoding.ts`

## Step 4: Deploy Firebase

```bash
# Login
firebase login

# Set project
firebase use YOUR_PROJECT_ID

# Deploy Firestore rules and indexes
firebase deploy --only firestore

# Deploy Cloud Functions
cd functions && npm run build && cd ..
firebase deploy --only functions
```

## Step 5: Run the App

```bash
# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

## Step 6: Build for Testing

```bash
# Login to EAS
eas login

# Build for internal testing
eas build --profile development --platform ios
eas build --profile development --platform android
```

## Step 7: Test with Firebase Emulator (Optional)

```bash
# Start emulators for local development
firebase emulators:start
```

Then configure your app to use emulators by adding to your Firebase init:
```typescript
if (__DEV__) {
  firestore().useEmulator('localhost', 8080);
  auth().useEmulator('http://localhost:9099');
}
```

## Environment Variables

For production, consider using `expo-constants` or a `.env` file:

| Variable | Description |
|---|---|
| `GOOGLE_PLACES_API_KEY` | Google Places API key |
| `GOOGLE_GEOCODING_API_KEY` | Google Geocoding API key |

## Project Structure

```
app-scaffold/
├── src/
│   ├── app/                    # Expo Router screens
│   │   ├── _layout.tsx         # Root layout
│   │   ├── index.tsx           # Splash/redirect
│   │   ├── auth.tsx            # Phone auth flow
│   │   ├── (tabs)/             # Tab navigator
│   │   │   ├── _layout.tsx     # Tab config
│   │   │   ├── index.tsx       # Home (parties list)
│   │   │   ├── history.tsx     # Past nominations
│   │   │   └── settings.tsx    # User settings
│   │   └── party/              # Party screens
│   │       ├── create.tsx      # Create new party
│   │       ├── [id].tsx        # Party lobby
│   │       ├── swipe.tsx       # Swipe engine
│   │       ├── success.tsx     # Nomination success
│   │       └── results.tsx     # Vote results
│   ├── components/
│   │   ├── cards/
│   │   │   ├── VenueCard.tsx   # Swipeable venue card
│   │   │   └── CardStack.tsx   # Card stack manager
│   │   └── party/
│   │       └── PartyListCard.tsx
│   ├── hooks/
│   │   ├── useAuth.ts          # Auth state listener
│   │   ├── useParties.ts       # Party list fetching
│   │   ├── usePartyLobby.ts    # Real-time lobby
│   │   ├── useSwipeSession.ts  # Swipe session manager
│   │   ├── useNominatedVenue.ts
│   │   ├── useResults.ts       # Vote results
│   │   ├── useDeepLink.ts      # Deep link handling
│   │   └── usePushNotifications.ts
│   ├── lib/
│   │   ├── api/
│   │   │   ├── places.ts       # Google Places integration
│   │   │   └── geocoding.ts    # Zip code → lat/lng
│   │   └── firebase/
│   │       ├── config.ts       # Firebase config
│   │       ├── auth.ts         # Auth operations
│   │       ├── parties.ts      # Party CRUD
│   │       ├── swipes.ts       # Swipe recording + results
│   │       └── firestore-schema.ts
│   ├── stores/
│   │   ├── authStore.ts        # Zustand auth state
│   │   └── partyStore.ts       # Zustand party state
│   ├── types/
│   │   └── index.ts            # TypeScript types
│   └── constants/
│       └── index.ts            # Colors, party rules
├── functions/                   # Firebase Cloud Functions
│   └── src/
│       └── index.ts            # Vote tally, nominations, push
├── firestore.rules             # Security rules
├── firestore.indexes.json      # Required indexes
├── firebase.json               # Firebase project config
├── app.json                    # Expo config
├── eas.json                    # EAS Build config
├── package.json
└── tsconfig.json
```
