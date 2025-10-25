// /src/core/firebase.js
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const cfg = {
  apiKey:            import.meta.env.VITE_FB_API_KEY,
  authDomain:        import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FB_PROJECT_ID,
  // IMPORTANT: must match your bucket exactly as shown in Firebase Storage
  storageBucket:     import.meta.env.VITE_FB_STORAGE_BUCKET, // e.g. looz-11581.firebasestorage.app
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FB_APP_ID,
  measurementId:     import.meta.env.VITE_FB_MEASUREMENT_ID,
};

// sanity check in dev
if (import.meta.env.DEV && Object.values(cfg).some(v => !v)) {
  // eslint-disable-next-line no-console
  console.error('[Firebase] Missing env vars — check .env.local', cfg);
}

export const app     = initializeApp(cfg);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

// persist auth between reloads
setPersistence(auth, browserLocalPersistence);

// Google provider (popup first, redirect fallback handled in login.js)
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
