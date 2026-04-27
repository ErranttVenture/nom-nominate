// Firebase configuration
// Values are loaded from environment variables at bundle time (see .env.example)
// IMPORTANT: Metro only inlines static process.env.EXPO_PUBLIC_* references — never dynamic access.

const _apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '';
const _authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '';
const _projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '';
const _storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '';
const _messagingSenderId = process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '';
const _appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '';

if (!_apiKey || !_projectId || !_appId) {
  console.error(
    '[Firebase] Missing env vars — copy .env.example to .env and fill in your values.\n' +
    `  EXPO_PUBLIC_FIREBASE_API_KEY: ${_apiKey ? 'OK' : 'MISSING'}\n` +
    `  EXPO_PUBLIC_FIREBASE_PROJECT_ID: ${_projectId ? 'OK' : 'MISSING'}\n` +
    `  EXPO_PUBLIC_FIREBASE_APP_ID: ${_appId ? 'OK' : 'MISSING'}`
  );
}

export const firebaseConfig = {
  apiKey: _apiKey,
  authDomain: _authDomain,
  projectId: _projectId,
  storageBucket: _storageBucket,
  messagingSenderId: _messagingSenderId,
  appId: _appId,
};

// Firestore collection names
export const COLLECTIONS = {
  USERS: 'users',
  PARTIES: 'parties',
  PARTY_MEMBERS: 'members', // subcollection of parties
  SWIPES: 'swipes', // subcollection of parties
  VENUES: 'venues', // subcollection of parties (cached venue data)
  OFFERS: 'offers',
  PARTY_CODES: 'partyCodes', // top-level lookup: {code} → partyId
} as const;
