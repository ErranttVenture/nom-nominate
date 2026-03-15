import { useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';

/**
 * Listen to Firebase auth state changes and sync with Zustand store.
 * When a user signs in/out, the store is updated automatically.
 */
export function useAuthListener() {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        const user: User = {
          id: firebaseUser.uid,
          phone: firebaseUser.phoneNumber ?? '',
          displayName: firebaseUser.displayName ?? '',
          createdAt: new Date(firebaseUser.metadata.creationTime ?? Date.now()),
        };
        setUser(user);
      } else {
        setUser(null);
      }
    });

    return unsubscribe;
  }, []);
}
