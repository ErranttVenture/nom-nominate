import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  updateProfile,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './config';
import { COLLECTIONS } from './config';

let confirmationResult: ConfirmationResult | null = null;

/**
 * Send SMS verification code to phone number.
 * On web, uses invisible reCAPTCHA.
 */
export async function signInWithPhone(phoneNumber: string): Promise<string> {
  // Set up invisible reCAPTCHA for web
  if (!(window as any).recaptchaVerifier) {
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
    });
  }

  const appVerifier = (window as any).recaptchaVerifier;
  confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  return 'confirmation-pending';
}

/**
 * Confirm the SMS verification code.
 */
export async function confirmVerificationCode(
  _confirmation: any,
  code: string
): Promise<{ isNewUser: boolean }> {
  if (!confirmationResult) throw new Error('No pending verification.');

  const credential = await confirmationResult.confirm(code);
  const user = credential.user;

  if (!user) throw new Error('Failed to verify code.');

  // Check if user profile exists in Firestore
  const userRef = doc(db, COLLECTIONS.USERS, user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    // New user — create profile stub
    await setDoc(userRef, {
      id: user.uid,
      phone: user.phoneNumber ?? '',
      displayName: '',
      createdAt: serverTimestamp(),
    });
    return { isNewUser: true };
  }

  return { isNewUser: false };
}

/**
 * Update the user's display name after initial signup.
 */
export async function updateUserProfile(displayName: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated.');

  await Promise.all([
    updateProfile(user, { displayName }),
    updateDoc(doc(db, COLLECTIONS.USERS, user.uid), { displayName }),
  ]);
}

/**
 * Save the user's FCM token for push notifications.
 */
export async function saveFCMToken(token: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), { fcmToken: token });
}

/**
 * Sign out the current user.
 */
export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Get the currently authenticated user's profile from Firestore.
 */
export async function getCurrentUserProfile() {
  const user = auth.currentUser;
  if (!user) return null;

  const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
  return userDoc.exists() ? userDoc.data() : null;
}
