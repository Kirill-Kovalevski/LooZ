// /src/services/categories.service.js
// Firestore-backed categories per user, with LS fallback

import { db, auth, authReady } from '../core/firebase.js';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  doc,
  serverTimestamp,
} from 'firebase/firestore';

const LS_KEY = 'looz:categories';

function lsGet() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
  catch { return []; }
}
function lsSet(list) {
  localStorage.setItem(LS_KEY, JSON.stringify(list || []));
}

function col(uid) {
  return collection(db, 'users', uid, 'categories');
}

/** live subscribe; cb(list) */
export async function subscribeCategories(cb) {
  await authReady;
  const user = auth.currentUser;
  if (!user) {
    // no login → just give LS
    cb(lsGet());
    return () => {};
  }
  return onSnapshot(col(user.uid), (snap) => {
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    lsSet(list);     // keep LS in sync for offline
    cb(list);
  });
}

export async function addCategory(data) {
  await authReady;
  const user = auth.currentUser;
  if (!user) {
    const list = lsGet();
    const item = {
      id: `local-${Date.now()}`,
      name: data.name || '',
      color: data.color || '',
      icon: data.icon || '',
      createdAt: Date.now(),
    };
    list.push(item);
    lsSet(list);
    return item.id;
  }
  const docRef = await addDoc(col(user.uid), {
    name: data.name || '',
    color: data.color || '',
    icon: data.icon || '',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCategory(id, patch) {
  await authReady;
  const user = auth.currentUser;
  if (!user) {
    const list = lsGet().map((c) => (c.id === id ? { ...c, ...patch } : c));
    lsSet(list);
    return;
  }
  await updateDoc(doc(db, 'users', user.uid, 'categories', id), patch);
}

export async function deleteCategory(id) {
  await authReady;
  const user = auth.currentUser;
  if (!user) {
    const list = lsGet().filter((c) => c.id !== id);
    lsSet(list);
    return;
  }
  await deleteDoc(doc(db, 'users', user.uid, 'categories', id));
}
