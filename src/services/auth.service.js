// /src/services/auth.service.js
// Central auth helpers for LooZ (Firebase Auth)

import {
  auth,
  googleProvider,
  facebookProvider,
  appleProvider,
} from '../core/firebase.js';

import {
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';

import {
  createUserProfileIfMissing,
  saveUserProfile,
} from './firestore.service.js';

/** Returns the current Firebase user (if any) */
export function getUser() {
  return auth.currentUser;
}

/** Is someone logged in right now? */
export function isLoggedIn() {
  return !!auth.currentUser || !!localStorage.getItem('looz_uid');
}

/** Subscribe to auth state changes */
export function watchAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}

/** Email/password sign-in */
export async function signInEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const user = cred.user;
  localStorage.setItem('looz_uid', user.uid);

  // make sure old accounts get a Firestore profile too
  await createUserProfileIfMissing(user.uid, user.email || email);

  return user;
}

/** Email/password sign-up (with optional displayName) */
export async function signUpEmail({ name, email, password }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;

  if (name) {
    try {
      await updateProfile(user, { displayName: name });
    } catch (_) {
      // ignore
    }
  }

  localStorage.setItem('looz_uid', user.uid);

  // ensure Firestore doc
  await createUserProfileIfMissing(user.uid, email);

  // write displayName if we have it
  if (name) {
    await saveUserProfile(user.uid, {
      displayName: name,
      email,
    });
  }

  return user;
}

/** Google sign-in / sign-up */
export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  const user = cred.user;

  localStorage.setItem('looz_uid', user.uid);

  await createUserProfileIfMissing(user.uid, user.email || '');

  if (user.displayName) {
    await saveUserProfile(user.uid, {
      displayName: user.displayName,
      email: user.email || '',
    });
  }

  return user;
}

/** Facebook sign-in / sign-up */
export async function signInWithFacebook() {
  const cred = await signInWithPopup(auth, facebookProvider);
  const user = cred.user;

  localStorage.setItem('looz_uid', user.uid);

  await createUserProfileIfMissing(user.uid, user.email || '');

  if (user.displayName) {
    await saveUserProfile(user.uid, {
      displayName: user.displayName,
      email: user.email || '',
    });
  }

  return user;
}

/** Apple sign-in / sign-up */
export async function signInWithApple() {
  const cred = await signInWithPopup(auth, appleProvider);
  const user = cred.user;

  localStorage.setItem('looz_uid', user.uid);

  await createUserProfileIfMissing(user.uid, user.email || '');

  if (user.displayName) {
    await saveUserProfile(user.uid, {
      displayName: user.displayName,
      email: user.email || '',
    });
  } else if (user.email) {
    await saveUserProfile(user.uid, { email: user.email });
  }

  return user;
}

/** Sign out and clear session */
export async function signOutUser() {
  try {
    await signOut(auth);
    localStorage.removeItem('looz_uid');
    sessionStorage.removeItem('looz.postLoginRedirect');
    location.hash = '#/login';
  } catch (err) {
    console.error('[signOutUser]', err);
    alert('שגיאה ביציאה מהחשבון');
  }
}
