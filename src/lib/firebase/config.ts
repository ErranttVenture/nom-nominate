// Firebase configuration
// Replace these values with your Firebase project config
// from Firebase Console > Project Settings > General > Your apps

export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

// Firestore collection names
export const COLLECTIONS = {
  USERS: 'users',
  PARTIES: 'parties',
  PARTY_MEMBERS: 'members', // subcollection of parties
  SWIPES: 'swipes', // subcollection of parties
  VENUES: 'venues', // subcollection of parties (cached venue data)
  OFFERS: 'offers',
} as const;
