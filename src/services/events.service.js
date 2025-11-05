// /src/services/events.service.js
// Firestore access for user events/tasks

import { db } from '../core/firebase.js';
import {
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

// helper: /users/{uid}/events
function eventsCollection(uid) {
  return collection(db, 'users', uid, 'events');
}

/**
 * Live subscribe to /users/{uid}/events
 * cb(items) -> items is array of { id, ...data }
 */
export function subscribeUserEvents(uid, cb) {
  const colRef = eventsCollection(uid);
  return onSnapshot(colRef, (snap) => {
    const items = [];
    snap.forEach((docSnap) => {
      items.push({ id: docSnap.id, ...docSnap.data() });
    });
    cb(items);
  });
}

/** one-time fetch (not really needed if you subscribe) */
export async function fetchUserEvents(uid) {
  const colRef = eventsCollection(uid);
  const snap = await getDocs(colRef);
  const items = [];
  snap.forEach((docSnap) => {
    items.push({ id: docSnap.id, ...docSnap.data() });
  });
  return items;
}

/** add event for user */
export async function addUserEvent(uid, evt) {
  const colRef = eventsCollection(uid);
  const payload = {
    title: evt.title || 'ללא כותרת',
    date: evt.date || '',
    time: evt.time || '',
    done: !!evt.done,
    removed: !!evt.removed,
    createdAt: serverTimestamp(),
    completedAt: evt.completedAt || null,
    removedAt: evt.removedAt || null,
  };
  const docRef = await addDoc(colRef, payload);
  return docRef.id;
}

/** update event */
export async function updateUserEvent(uid, id, data) {
  const ref = doc(db, 'users', uid, 'events', id);
  await updateDoc(ref, data);
}

/** delete event permanently */
export async function deleteUserEvent(uid, id) {
  const ref = doc(db, 'users', uid, 'events', id);
  await deleteDoc(ref);
}
