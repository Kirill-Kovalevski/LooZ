// /src/services/social.service.js
// Firestore social for a single user, with LS fallback.
// Path in Firestore: users/{uid}/socialPosts  ← matches your screenshot

import { db, auth, authReady } from '../core/firebase.js';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  doc,
  serverTimestamp,
  getDoc,
  arrayUnion,
  increment,
} from 'firebase/firestore';

// if your project already exports storage from core/firebase.js,
// you can swap the 2 lines below to use that instead
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const LS_POSTS = 'social.posts.v2';

function lsGet() {
  try {
    return JSON.parse(localStorage.getItem(LS_POSTS) || '[]');
  } catch {
    return [];
  }
}
function lsSet(list) {
  localStorage.setItem(LS_POSTS, JSON.stringify(list || []));
}

// users/{uid}/socialPosts
function postsCol(uid) {
  return collection(db, 'users', uid, 'socialPosts');
}

/** live subscribe */
export async function subscribeSocialPosts(cb) {
  await authReady;
  const user = auth.currentUser;
  if (!user) {
    cb(lsGet());
    return () => {};
  }
  return onSnapshot(postsCol(user.uid), (snap) => {
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    lsSet(list); // keep LS in sync
    cb(list);
  });
}

/** create post with author/avatar/images saved in Firestore */
export async function createSocialPost(data) {
  await authReady;
  const user = auth.currentUser;

  const payload = {
    authorUid: user ? user.uid : null,
    author:
      data.author ||
      localStorage.getItem('firstName') ||
      user?.displayName ||
      user?.email ||
      'אורח',
    avatar:
      data.avatar ||
      localStorage.getItem('profile.avatar') ||
      localStorage.getItem('profile.avatarUrl') ||
      localStorage.getItem('avatarUrl') ||
      '',
    title: data.title || '',
    text: data.text || '',
    images: data.images || [],
    cheers: 0,
    likedBy: [],
    comments: [],
    createdAt: serverTimestamp(),
  };

  if (!user) {
    const list = lsGet();
    const item = { id: `local-${Date.now()}`, ...payload, createdAt: Date.now() };
    list.unshift(item);
    lsSet(list);
    return item.id;
  }

  const refDoc = await addDoc(postsCol(user.uid), payload);
  return refDoc.id;
}

/** toggle like for current user */
export async function toggleCheerOnPost(id) {
  await authReady;
  const user = auth.currentUser;
  if (!user) return;

  const refDoc = doc(db, 'users', user.uid, 'socialPosts', id);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) return;
  const data = snap.data();
  const likedBy = Array.isArray(data.likedBy) ? data.likedBy : [];
  const has = likedBy.includes(user.uid);

  await updateDoc(refDoc, {
    cheers: increment(has ? -1 : 1),
    likedBy: has ? likedBy.filter((x) => x !== user.uid) : [...likedBy, user.uid],
  });
}

/** add a comment (saves author/avatar from app first) */
export async function addCommentToPost(id, comment) {
  await authReady;
  const user = auth.currentUser;
  const refDoc = doc(db, 'users', user?.uid || comment.ownerUid, 'socialPosts', id);

  const payload = {
    text: comment.text || '',
    author:
      comment.author ||
      localStorage.getItem('firstName') ||
      user?.displayName ||
      user?.email ||
      'אורח',
    avatar:
      comment.avatar ||
      localStorage.getItem('profile.avatar') ||
      localStorage.getItem('profile.avatarUrl') ||
      localStorage.getItem('avatarUrl') ||
      '',
    createdAt: serverTimestamp(),
  };

  await updateDoc(refDoc, {
    comments: arrayUnion(payload),
  });
}

/** optional: upload image for a post to /users/{uid}/social/ */
export async function uploadPostImage(file) {
  await authReady;
  const user = auth.currentUser;
  if (!user) throw new Error('no user');
  const storage = getStorage();
  const path = `users/${user.uid}/social/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
}

/** keep delete in case you need it */
export async function deletePost(id) {
  await authReady;
  const user = auth.currentUser;
  if (!user) {
    const list = lsGet().filter((p) => p.id !== id);
    lsSet(list);
    return;
  }
  await deleteDoc(doc(db, 'users', user.uid, 'socialPosts', id));
}

/** small helper for the profile page, in case you still use it */
export function getLocalSocialActivity() {
  return {
    likes: [],
    comments: [],
    posts: lsGet(),
  };
}
