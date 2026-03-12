import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: 'AIzaSyB3c0Gvh-SHmjXbXqdGMFjRstsudnutS4Q',
  authDomain: 'nom-nominate.firebaseapp.com',
  projectId: 'nom-nominate',
  storageBucket: 'nom-nominate.firebasestorage.app',
  messagingSenderId: '964967620859',
  appId: '1:964967620859:web:8e571943838f956884505e',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;

// Firestore collection names
export const COLLECTIONS = {
  USERS: 'users',
  PARTIES: 'parties',
  PARTY_MEMBERS: 'members', // subcollection of parties
  SWIPES: 'swipes', // subcollection of parties
  VENUES: 'venues', // subcollection of parties (cached venue data)
  OFFERS: 'offers',
} as const;
