// /src/services/firestore.service.js
import { db } from '../core/firebase.js';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

/**
 * Fields we allow to be saved on /users/{uid}.
 * We widened this so profile/settings can actually store what LooZ needs.
 */
const ALLOWED = new Set([
  // names
  'firstName',
  'lastName',
  'displayName',
  'bio',

  // handles / profile object
  'profile',
  'profile.handle',

  // images (two casing styles so we don't break old code)
  'avatarUrl',
  'avatarURL',
  'avatarPath',
  'coverUrl',
  'coverURL',
  'coverPath',

  // app prefs
  'theme',
  'defaultView',

  // email (for completeness)
  'email',
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
  safe.updatedAt = serverTimestamp();
  await setDoc(doc(db, 'users', uid), safe, { merge: true });
}

/**
 * getUserProfile(uid)
 * Reads /users/{uid}, returns null if missing.
 */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const ref  = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/**
 * createUserProfileIfMissing(uid, email)
 * Called right after signup / provider sign-in.
 */
export async function createUserProfileIfMissing(uid, email = '') {
  const ref  = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  const base = {
    email,
    displayName: '',
    avatarUrl: '',
    coverUrl: '',
    theme: 'light',
    defaultView: 'month',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, base, { merge: true });
}
