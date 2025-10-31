// /src/services/auth.service.js
// Central auth helpers for LooZ (Firebase Auth)

import { auth } from '../core/firebase.js';
import {
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';

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
  localStorage.setItem('looz_uid', cred.user.uid);
  return cred.user;
}

/** Email/password sign-up (with optional displayName) */
export async function signUpEmail({ name, email, password }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    try { await updateProfile(cred.user, { displayName: name }); } catch {}
  }
  localStorage.setItem('looz_uid', cred.user.uid);
  return cred.user;
}

/** Google sign-in / sign-up (popup) */
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  localStorage.setItem('looz_uid', cred.user.uid);
  return cred.user;
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
