// /src/utils/authWatcher.js
// Watches Firebase Auth and routes accordingly.

import { auth } from '../core/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { apply } from '../router.js';

let _booted = false;

export function initAuthWatcher() {
  if (_booted) return;
  _booted = true;

  onAuthStateChanged(auth, (user) => {
    console.log('[AuthWatcher] user =', user?.email || 'none');
    if (user) {
      localStorage.setItem('looz_uid', user.uid);
      const redirect = sessionStorage.getItem('looz.postLoginRedirect');
      if (redirect) {
        sessionStorage.removeItem('looz.postLoginRedirect');
        location.hash = redirect;
      } else if (location.hash === '#/login' || location.hash === '') {
        location.hash = '#/week';
      }
    } else {
      localStorage.removeItem('looz_uid');
      if (!location.hash.includes('/login')) {
        location.hash = '#/login';
      }
    }
  });

  // also run once to normalize routes after page load
  setTimeout(() => apply(location.hash), 500);
}
