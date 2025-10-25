// /src/core/firebase.js
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,        // <-- add this
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const cfg = {
  apiKey:             import.meta.env.VITE_FB_API_KEY,
  authDomain:         import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId:          import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket:      import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId:  import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId:              import.meta.env.VITE_FB_APP_ID,
  measurementId:      import.meta.env.VITE_FB_MEASUREMENT_ID,
};

if (Object.values(cfg).some(v => !v)) {
  console.error('[Firebase] Missing env vars — check .env.local / .env.production', cfg);
}

const app = initializeApp(cfg);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

// ✅ Resolve once with the initial user (or null)
export const authReady = new Promise(resolve => {
  const stop = onAuthStateChanged(auth, user => {
    stop();
    resolve(user);
  });
});

export const db      = getFirestore(app);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
