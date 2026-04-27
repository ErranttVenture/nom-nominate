import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Platform } from 'react-native';
import { COLLECTIONS } from './config';

/**
 * Phone auth verification result returned to the UI layer.
 */
export interface PhoneVerificationResult {
  verificationId: string;
  /**
   * On Android: true if auto-verify completed within the auto-verify
   * window — the user is already signed in. False after AUTO_VERIFY_TIMEOUT
   * (UI should now show manual code entry).
   * On iOS: always false (iOS has no auto-verify).
   */
  autoVerified: boolean;
  /** Set when autoVerified is true: whether the signed-in user is new. */
  isNewUser?: boolean;
}

/** Auto-verify timeout in seconds — kept short so UX falls through to
 *  manual entry quickly when the SMS Retriever doesn't fire. */
const AUTO_VERIFY_TIMEOUT_SECONDS = 10;

/**
 * Send SMS verification code to phone number.
 *
 * On Android, uses verifyPhoneNumber and waits the full auto-verify
 * window before resolving. The Promise resolves with autoVerified=true
 * if AUTO_VERIFIED fires (silent sign-in), or autoVerified=false on
 * AUTO_VERIFY_TIMEOUT (UI should switch to manual code entry). This
 * keeps the user on the phone-entry screen during the wait so there
 * is no flash to a verify screen if auto-verify ultimately succeeds.
 *
 * On iOS, uses signInWithPhoneNumber (no auto-verify).
 */
export function sendVerificationCode(
  phoneNumber: string,
): Promise<PhoneVerificationResult> {
  return new Promise((resolve, reject) => {
    if (Platform.OS === 'android') {
      let resolved = false;
      let capturedVerificationId = '';
      let codeSent = false;

      auth().verifyPhoneNumber(phoneNumber, AUTO_VERIFY_TIMEOUT_SECONDS)
        .on('state_changed', async (phoneAuthSnapshot) => {
          console.log('[PhoneAuth] State:', phoneAuthSnapshot.state);
          console.log('[PhoneAuth] verificationId:', phoneAuthSnapshot.verificationId?.substring(0, 15));

          switch (phoneAuthSnapshot.state) {
            case auth.PhoneAuthState.CODE_SENT:
              console.log('[PhoneAuth] Code sent successfully — waiting for auto-verify or timeout');
              codeSent = true;
              capturedVerificationId = phoneAuthSnapshot.verificationId;
              // Intentionally do NOT resolve here — keep listening so
              // the UI stays on the phone-entry screen until either
              // AUTO_VERIFIED or AUTO_VERIFY_TIMEOUT fires.
              break;

            case auth.PhoneAuthState.AUTO_VERIFIED:
              console.log('[PhoneAuth] Auto-verified on Android');
              if (resolved) break;
              try {
                const credential = auth.PhoneAuthProvider.credential(
                  phoneAuthSnapshot.verificationId,
                  phoneAuthSnapshot.code!
                );
                const userCredential = await auth().signInWithCredential(credential);
                const newUserResult = await ensureUserProfile(userCredential.user);

                resolved = true;
                resolve({
                  verificationId: phoneAuthSnapshot.verificationId,
                  autoVerified: true,
                  isNewUser: newUserResult.isNewUser,
                });
              } catch (err: any) {
                console.error('[PhoneAuth] Auto-verify sign-in error:', err);
                // Auto sign-in failed but we still have the verificationId.
                // Fall back to manual entry by resolving with autoVerified=false.
                if (!resolved) {
                  resolved = true;
                  resolve({
                    verificationId:
                      capturedVerificationId || phoneAuthSnapshot.verificationId,
                    autoVerified: false,
                  });
                }
              }
              break;

            case auth.PhoneAuthState.AUTO_VERIFY_TIMEOUT:
              console.log('[PhoneAuth] Auto-verify timeout, manual entry required');
              if (!resolved) {
                resolved = true;
                resolve({
                  verificationId:
                    capturedVerificationId || phoneAuthSnapshot.verificationId,
                  autoVerified: false,
                });
              }
              break;

            case auth.PhoneAuthState.ERROR:
              console.error('[PhoneAuth] Error:', phoneAuthSnapshot.error);
              if (resolved) break;
              if (codeSent && capturedVerificationId) {
                // Error happened after CODE_SENT — let the user try
                // manual entry rather than blocking them.
                resolved = true;
                resolve({
                  verificationId: capturedVerificationId,
                  autoVerified: false,
                });
              } else {
                resolved = true;
                reject(
                  phoneAuthSnapshot.error || new Error('Phone verification failed')
                );
              }
              break;
          }
        });
    } else {
      // iOS: signInWithPhoneNumber. No auto-verify — UI must show the
      // manual code entry screen.
      auth()
        .signInWithPhoneNumber(phoneNumber)
        .then((confirmationResult) => {
          resolve({
            verificationId: (confirmationResult as any).verificationId || '',
            autoVerified: false,
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

  if (!userDoc.exists()) {
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

  return doc.exists() ? (doc.data() ?? null) : null;
}
