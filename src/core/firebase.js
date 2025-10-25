// /src/core/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const cfg = {
  apiKey:            import.meta.env.VITE_FB_API_KEY,
  authDomain:        import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FB_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FB_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FB_APP_ID,
};

function normalizeBucket(bucket, projectId) {
  if (!bucket && projectId) return `${projectId}.appspot.com`;
  if (/\.firebasestorage\.app$/i.test(bucket)) {
    const id = bucket.replace(/\.firebasestorage\.app$/i, '');
    return `${id}.appspot.com`;
  }
  return bucket;
}
cfg.storageBucket = normalizeBucket(cfg.storageBucket, cfg.projectId);

const app = getApps().length ? getApps()[0] : initializeApp(cfg);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});
const db = getFirestore(app);
const storage = getStorage(app, `gs://${cfg.storageBucket}`);

export { app, auth, db, storage };
export default { app, auth, db, storage };
