/**
 * Short-code layer — 5-char codes used as shareable party join IDs.
 *
 * Alphabet: A-Z 0-9 minus I / O / 0 / 1 (those 4 are visually ambiguous).
 * That leaves 32 characters → 32^5 = ~33.5M possible codes.
 *
 * Collision handling: try up to N random codes; each attempt uses a
 * transaction so two creators racing on the same code can't both win.
 * In practice collision is extremely rare; we keep retries tight.
 *
 * Storage model:
 *   - `partyCodes/{CODE}` → { partyId, createdAt }  (top-level lookup)
 *   - Party doc gains a `joinCode` field (same value)
 * This preserves Firestore auto-IDs as the canonical key for deep links
 * and writes; codes are just a human-friendly alias.
 */

import firestore from '@react-native-firebase/firestore';
import { COLLECTIONS } from './config';

// Alphabet excludes I, O, 0, 1 for legibility.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;
const MAX_ATTEMPTS = 8;

/** Generate a single random code (no collision check). */
export function generateCode(): string {
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/**
 * Normalize user input: trim, uppercase, keep only alphabet chars.
 * Ambiguous characters (I/O/0/1) are not in our alphabet — strip them
 * silently rather than guess what the user meant.
 */
export function normalizeCode(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .split('')
    .filter((ch) => ALPHABET.includes(ch))
    .join('')
    .slice(0, CODE_LENGTH);
}

/**
 * Allocate a unique code and write the `partyCodes/{code}` lookup doc
 * bound to `partyId`. Retries on collision up to MAX_ATTEMPTS.
 * Returns the allocated code.
 */
export async function allocatePartyCode(partyId: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateCode();
    const codeRef = firestore().collection(COLLECTIONS.PARTY_CODES).doc(code);

    try {
      const allocated = await firestore().runTransaction(async (tx) => {
        const existing = await tx.get(codeRef);
        if (existing.exists()) return false;
        tx.set(codeRef, {
          partyId,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        return true;
      });
      if (allocated) return code;
    } catch (e) {
      // Fall through and retry
      console.warn('[shortCode] allocate attempt failed, retrying', e);
    }
  }
  throw new Error(
    'Failed to generate a unique party code — please try again in a moment.'
  );
}

/**
 * Look up the Firestore party ID behind a code.
 * Returns null if not found.
 */
export async function resolveCodeToPartyId(
  rawCode: string
): Promise<string | null> {
  const code = normalizeCode(rawCode);
  if (code.length !== CODE_LENGTH) return null;
  const doc = await firestore()
    .collection(COLLECTIONS.PARTY_CODES)
    .doc(code)
    .get();
  if (!doc.exists()) return null;
  const data = doc.data() as { partyId?: string } | undefined;
  return data?.partyId ?? null;
}
