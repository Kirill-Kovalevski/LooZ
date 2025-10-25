// /src/services/firestore.service.js
import { db } from '../core/firebase.js';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function saveUserProfile(uid, data) {
  if (!uid) return;
  const ref = doc(db, 'users', uid);
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
}
