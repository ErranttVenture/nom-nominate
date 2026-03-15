import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from './config';

/**
 * Send SMS verification code to phone number.
 */
export async function signInWithPhone(
  phoneNumber: string
): Promise<FirebaseAuthTypes.ConfirmationResult> {
  return auth().signInWithPhoneNumber(phoneNumber);
}

/**
 * Confirm the SMS verification code.
 * Returns whether the user is new (needs to set display name).
 */
export async function confirmVerificationCode(
  confirmationResult: FirebaseAuthTypes.ConfirmationResult,
  code: string
): Promise<{ isNewUser: boolean }> {
  const credential = await confirmationResult.confirm(code);
  const user = credential?.user;

  if (!user) throw new Error('Failed to verify code.');

  // Check if user profile exists in Firestore
  const userDoc = await firestore()
    .collection(COLLECTIONS.USERS)
    .doc(user.uid)
    .get();

  if (!userDoc.exists) {
    // New user — create profile stub
    await firestore().collection(COLLECTIONS.USERS).doc(user.uid).set({
      id: user.uid,
      phone: user.phoneNumber ?? '',
      displayName: '',
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    return { isNewUser: true };
  }

  return { isNewUser: false };
}

/**
 * Update the user's display name after initial signup.
 */
export async function updateUserProfile(displayName: string): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('Not authenticated.');

  await Promise.all([
    auth().currentUser?.updateProfile({ displayName }),
    firestore().collection(COLLECTIONS.USERS).doc(user.uid).update({
      displayName,
    }),
  ]);
}

/**
 * Save the user's FCM token for push notifications.
 */
export async function saveFCMToken(token: string): Promise<void> {
  const user = auth().currentUser;
  if (!user) return;

  await firestore().collection(COLLECTIONS.USERS).doc(user.uid).update({
    fcmToken: token,
  });
}

/**
 * Sign out the current user.
 */
export async function signOutUser(): Promise<void> {
  await auth().signOut();
}

/**
 * Get the currently authenticated user's profile from Firestore.
 */
export async function getCurrentUserProfile() {
  const user = auth().currentUser;
  if (!user) return null;

  const doc = await firestore()
    .collection(COLLECTIONS.USERS)
    .doc(user.uid)
    .get();

  return doc.exists ? (doc.data() ?? null) : null;
}
