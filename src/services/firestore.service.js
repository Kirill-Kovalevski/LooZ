// /src/services/firestore.service.js
import { db } from '../core/firebase.js';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Save (merge) a subset of profile fields for the given uid.
 * Only whitelisted fields are persisted.
 */
const ALLOWED = new Set([
  'firstName', 'lastName', 'profile', 'profile.handle',
  'avatarUrl', 'avatarPath',
  'coverUrl',  'coverPath'
]);

function pickAllowed(data) {
  const out = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (ALLOWED.has(k)) out[k] = v;
  }
  return out;
}

/**
 * saveUserProfile(uid, data)
 * Writes to /users/{uid} with merge.
 */
export async function saveUserProfile(uid, data) {
  if (!uid) throw new Error('Missing uid');
  const safe = pickAllowed(data);
  // Always keep an updatedAt for debugging
  safe.updatedAt = serverTimestamp();
  await setDoc(doc(db, 'users', uid), safe, { merge: true });
}
