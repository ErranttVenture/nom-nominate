/**
 * Helper to get current user info regardless of whether auth is mocked or real Firebase.
 *
 * When USE_MOCK_AUTH is true, we fall back to the Zustand auth store (which has the mock user).
 * When USE_MOCK_AUTH is false, we use Firebase auth.currentUser.
 */

import { auth } from './config';
import { useAuthStore } from '@/stores/authStore';

export function getCurrentUserId(): string {
  // Try Firebase auth first
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }

  // Fall back to mock auth store
  const storeUser = useAuthStore.getState().user;
  if (storeUser) {
    return storeUser.id;
  }

  throw new Error('Not authenticated.');
}

export function getCurrentUserDisplayName(): string {
  if (auth.currentUser?.displayName) {
    return auth.currentUser.displayName;
  }

  const storeUser = useAuthStore.getState().user;
  return storeUser?.displayName ?? 'User';
}
