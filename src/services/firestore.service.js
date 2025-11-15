// /src/services/firestore.service.js
// Central place for user profile storage in Firestore.
//
// - Ensures we always save firstName, lastName, displayName, email
// - Generates searchTokens so userSearch can find people
// - Works for email/password + Google/Apple/Facebook providers

import { db, auth } from '../core/firebase.js';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

/**
 * Fields we allow to be saved on /users/{uid}.
 * Widened so profile/settings can store what LooZ needs.
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

  // search helpers
  'searchTokens',
]);

function pickAllowed(data) {
  const out = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (ALLOWED.has(k)) out[k] = v;
  }
  return out;
}

/* ─────────────────────────────────────────────
   Helpers for names + search tokens
────────────────────────────────────────────── */

/**
 * Given partial data + runtime auth user,
 * derive consistent firstName, lastName, displayName.
 */
function deriveNameFields(partial = {}, runtimeUser = null) {
  const out = {
    firstName: (partial.firstName || '').trim(),
    lastName: (partial.lastName || '').trim(),
    displayName: (partial.displayName || '').trim(),
  };

  const email = (partial.email || runtimeUser?.email || '').trim();

  // if displayName still empty, try runtime user
  let candidateDisplay = out.displayName;
  if (!candidateDisplay && runtimeUser?.displayName) {
    candidateDisplay = runtimeUser.displayName;
  }

  // if still empty and we have email, use part before @
  if (!candidateDisplay && email) {
    candidateDisplay = email.split('@')[0];
  }

  candidateDisplay = (candidateDisplay || '').trim();

  // If we don't have first/last but we DO have a display name, split it
  if (!out.firstName && !out.lastName && candidateDisplay) {
    const parts = candidateDisplay.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      out.firstName = parts[0];
    } else if (parts.length > 1) {
      out.firstName = parts[0];
      out.lastName = parts.slice(1).join(' ');
    }
  }

  // If displayName missing but we do have first/last, build it
  if (!candidateDisplay && (out.firstName || out.lastName)) {
    candidateDisplay = `${out.firstName} ${out.lastName}`.trim();
  }

  out.displayName = candidateDisplay || '';

  return out;
}

/**
 * Build searchTokens based on name + email + handle.
 * These are lower-cased strings used by userSearch.service.js.
 */
function buildSearchTokens(opts = {}) {
  const set = new Set();
  const add = (str) => {
    if (!str) return;
    const s = String(str).toLowerCase();
    if (!s) return;
    set.add(s);
    s.split(/\s+/).forEach((p) => {
      if (p) set.add(p);
    });
  };

  add(opts.firstName);
  add(opts.lastName);
  add(opts.displayName);
  add(opts.handle);

  if (opts.email) {
    const email = String(opts.email).toLowerCase();
    const local = email.split('@')[0];
    add(local);
    set.add(email);
  }

  return Array.from(set);
}

/* ─────────────────────────────────────────────
   saveUserProfile(uid, data)
   Writes to /users/{uid} with merge.
────────────────────────────────────────────── */

/**
 * saveUserProfile(uid, data)
 * Called from profile/settings screens.
 * Ensures we keep name fields + searchTokens in sync.
 */
export async function saveUserProfile(uid, data) {
  if (!uid) throw new Error('Missing uid');

  const runtime = auth.currentUser || null;
  const safe = pickAllowed(data);
  const email = (safe.email || runtime?.email || '').trim();

  // Extract handle from either nested profile or flattened profile.handle
  let handle = '';
  if (safe.profile && typeof safe.profile === 'object') {
    handle = safe.profile.handle || '';
  }
  if (!handle && typeof data['profile.handle'] === 'string') {
    handle = data['profile.handle'];
    // if we only got a flattened handle, make sure profile map exists
    safe.profile = safe.profile || {};
    safe.profile.handle = handle;
  }

  // Names
  const nameParts = deriveNameFields(
    {
      firstName: safe.firstName,
      lastName: safe.lastName,
      displayName: safe.displayName,
      email,
    },
    runtime
  );

  safe.firstName = nameParts.firstName;
  safe.lastName = nameParts.lastName;
  safe.displayName = nameParts.displayName;
  safe.email = email;

  // Search tokens
  const tokens = buildSearchTokens({
    firstName: safe.firstName,
    lastName: safe.lastName,
    displayName: safe.displayName,
    email,
    handle,
  });
  if (tokens.length) safe.searchTokens = tokens;

  safe.updatedAt = serverTimestamp();

  await setDoc(doc(db, 'users', uid), safe, { merge: true });
}

/* ─────────────────────────────────────────────
   getUserProfile(uid)
────────────────────────────────────────────── */

export async function getUserProfile(uid) {
  if (!uid) return null;
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/* ─────────────────────────────────────────────
   createUserProfileIfMissing(uid, email?)
   Called after signup/provider sign-in.
   Makes sure EVERY new user has searchable data.
────────────────────────────────────────────── */

/**
 * createUserProfileIfMissing(uid, email = '')
 * Works for:
 *  - email/password sign-up
 *  - Google / Apple / Facebook providers
 * because we read from auth.currentUser too.
 */
export async function createUserProfileIfMissing(uid, email = '') {
  if (!uid) throw new Error('Missing uid');

  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  const runtime = auth.currentUser || null;
  const finalEmail = (email || runtime?.email || '').trim();

  // Names
  const nameParts = deriveNameFields(
    {
      displayName: runtime?.displayName || '',
      email: finalEmail,
    },
    runtime
  );

  // Simple default handle: part before @
  const handleCandidate = finalEmail ? finalEmail.split('@')[0] : '';

  const searchTokens = buildSearchTokens({
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    displayName: nameParts.displayName,
    email: finalEmail,
    handle: handleCandidate,
  });

  const base = {
    email: finalEmail,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    displayName: nameParts.displayName,
    profile: handleCandidate ? { handle: handleCandidate } : {},
    avatarUrl: runtime?.photoURL || '',
    coverUrl: '',
    theme: 'light',
    defaultView: 'month',
    searchTokens,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, base, { merge: true });
}
