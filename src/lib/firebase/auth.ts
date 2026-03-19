import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Platform } from 'react-native';
import { COLLECTIONS } from './config';

/**
 * Phone auth verification result returned to the UI layer.
 */
export interface PhoneVerificationResult {
  verificationId: string;
  /** If true, Android auto-verified — user is already signed in. */
  autoVerified?: boolean;
  /** If auto-verified, includes whether user is new. */
  isNewUser?: boolean;
}

/**
 * Callback fired when Android auto-verifies the SMS code in the background.
 * This happens AFTER the initial Promise resolves with CODE_SENT.
 */
export type AutoVerifyCallback = (result: {
  isNewUser: boolean;
}) => void;

/**
 * Send SMS verification code to phone number.
 *
 * On Android, uses verifyPhoneNumber for explicit control over the
 * verification lifecycle. The Promise resolves once CODE_SENT fires.
 * If Android later auto-verifies, the onAutoVerify callback fires separately.
 *
 * On iOS, uses signInWithPhoneNumber.
 */
export function sendVerificationCode(
  phoneNumber: string,
  onAutoVerify?: AutoVerifyCallback,
): Promise<PhoneVerificationResult> {
  return new Promise((resolve, reject) => {
    if (Platform.OS === 'android') {
      let resolved = false;

      auth().verifyPhoneNumber(phoneNumber)
        .on('state_changed', async (phoneAuthSnapshot) => {
          console.log('[PhoneAuth] State:', phoneAuthSnapshot.state);
          console.log('[PhoneAuth] verificationId:', phoneAuthSnapshot.verificationId?.substring(0, 15));

          switch (phoneAuthSnapshot.state) {
            case auth.PhoneAuthState.CODE_SENT:
              console.log('[PhoneAuth] Code sent successfully');
              if (!resolved) {
                resolved = true;
                resolve({
                  verificationId: phoneAuthSnapshot.verificationId,
                });
              }
              break;

            case auth.PhoneAuthState.AUTO_VERIFIED:
              console.log('[PhoneAuth] Auto-verified on Android');
              try {
                const credential = auth.PhoneAuthProvider.credential(
                  phoneAuthSnapshot.verificationId,
                  phoneAuthSnapshot.code!
                );
                const userCredential = await auth().signInWithCredential(credential);
                const newUserResult = await ensureUserProfile(userCredential.user);

                if (!resolved) {
                  // AUTO_VERIFIED fired before CODE_SENT (rare but possible)
                  resolved = true;
                  resolve({
                    verificationId: phoneAuthSnapshot.verificationId,
                    autoVerified: true,
                    isNewUser: newUserResult.isNewUser,
                  });
                } else {
                  // AUTO_VERIFIED fired AFTER CODE_SENT already resolved.
                  // The UI is on the code entry screen — notify it via callback.
                  console.log('[PhoneAuth] Auto-verify after CODE_SENT, calling callback');
                  onAutoVerify?.(newUserResult);
                }
              } catch (err: any) {
                console.error('[PhoneAuth] Auto-verify sign-in error:', err);
                // Don't reject — the user can still enter the code manually
                // unless the session is now invalid, which we can't prevent
              }
              break;

            case auth.PhoneAuthState.AUTO_VERIFY_TIMEOUT:
              console.log('[PhoneAuth] Auto-verify timeout, manual entry required');
              // CODE_SENT should have already resolved the Promise.
              // If somehow it didn't (very rare), resolve now.
              if (!resolved) {
                resolved = true;
                resolve({
                  verificationId: phoneAuthSnapshot.verificationId,
                });
              }
              break;

            case auth.PhoneAuthState.ERROR:
              console.error('[PhoneAuth] Error:', phoneAuthSnapshot.error);
              if (!resolved) {
                resolved = true;
                reject(phoneAuthSnapshot.error || new Error('Phone verification failed'));
              }
              break;
          }
        });
    } else {
      // iOS: use signInWithPhoneNumber
      auth()
        .signInWithPhoneNumber(phoneNumber)
        .then((confirmationResult) => {
          resolve({
            verificationId: (confirmationResult as any).verificationId || '',
          });
        })
        .catch(reject);
    }
  });
}

/**
 * Confirm the SMS verification code using verificationId + code.
 * Creates a credential manually and signs in.
 */
export async function confirmVerificationCode(
  verificationId: string,
  code: string
): Promise<{ isNewUser: boolean }> {
  console.log('[PhoneAuth] Confirming code with verificationId:', verificationId?.substring(0, 15) + '...');

  if (!verificationId) {
    throw new Error('No verification session found. Please request a new code.');
  }

  // Check if the user is already signed in (auto-verification may have completed)
  const currentUser = auth().currentUser;
  if (currentUser) {
    console.log('[PhoneAuth] User already signed in (auto-verified), checking profile');
    return ensureUserProfile(currentUser);
  }

  const credential = auth.PhoneAuthProvider.credential(verificationId, code);
  const userCredential = await auth().signInWithCredential(credential);
  const user = userCredential?.user;

  if (!user) throw new Error('Failed to verify code.');

  return ensureUserProfile(user);
}

/**
 * Ensure user profile exists in Firestore. Creates stub if new user.
 */
async function ensureUserProfile(
  user: FirebaseAuthTypes.User
): Promise<{ isNewUser: boolean }> {
  const userDoc = await firestore()
    .collection(COLLECTIONS.USERS)
    .doc(user.uid)
    .get();

  if (!userDoc.exists) {
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
