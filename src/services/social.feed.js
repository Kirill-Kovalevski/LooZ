// /src/services/social.feed.js
import { db } from '../core/firebase.js';
import { collection, addDoc } from 'firebase/firestore';

/**
 * Persist a social activity item to the owner's feed
 * @param {string} ownerUid  // whose feed this belongs to
 * @param {'like'|'comment'} kind
 * @param {{ postId:string, title?:string, text?:string, dateKey?:string, time?:string }} payload
 */
export async function logSocialActivity(ownerUid, kind, payload={}) {
  if (!db || !ownerUid) return;
  const col = collection(db, 'users', ownerUid, 'socialActivity');
  await addDoc(col, {
    kind,
    ...payload,
    createdAt: new Date()
  });
}
