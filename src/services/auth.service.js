// /src/services/auth.service.js
// Handles user authentication helpers for LooZ
// --------------------------------------------------

import { auth } from '../core/firebase.js';
import {
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

/**
 * Get the current Firebase user (if logged in)
 */
export function getUser() {
  return auth.currentUser;
}

/**
 * Listen to auth changes (optional external usage)
 */
export function watchAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Sign out the current user and clear stored session
 */
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

/**
 * Utility: Check if a user is currently authenticated
 */
export function isLoggedIn() {
  return !!auth.currentUser || !!localStorage.getItem('looz_uid');
}
