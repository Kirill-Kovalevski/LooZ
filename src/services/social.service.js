// /src/services/social.service.js
// Social feed stored at: users/{uid}/socialPosts
// - Keeps your LS fallback
// - Ensures authorUid is saved on create (needed by rules)
// - Logs likes/comments to users/{ownerUid}/socialActivity for the Profile page
// - Works with your existing social.js (no signature changes), but allows
//   optional ownerUid for future cross-user feeds.

// Firestore + Auth
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

// Storage (keep using this form unless you already export storage instance)
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Activity logging (Profile page uses it)
import { logSocialActivity } from './social.feed.js';

const LS_POSTS = 'social.posts.v2';

function lsGet() {
  try { return JSON.parse(localStorage.getItem(LS_POSTS) || '[]'); }
  catch { return []; }
}
function lsSet(list) { localStorage.setItem(LS_POSTS, JSON.stringify(list || [])); }

// Collection helper: users/{uid}/socialPosts
function postsCol(uid) {
  return collection(db, 'users', uid, 'socialPosts');
}

/** -----------------------------------------------------------
 * Live subscribe to the CURRENT user's posts (your original UX)
 * ---------------------------------------------------------- */
export async function subscribeSocialPosts(cb) {
  await authReady;
  const user = auth.currentUser;
  if (!user) { cb(lsGet()); return () => {}; }
  return onSnapshot(postsCol(user.uid), (snap) => {
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    lsSet(list);             // keep LS in sync for offline/profile
    cb(list);
  });
}

/** -----------------------------------------------------------
 * Create a post (saves authorUid)
 * ---------------------------------------------------------- */
export async function createSocialPost(data) {
  await authReady;
  const user = auth.currentUser;

  const payload = {
    authorUid: user ? user.uid : null, // 🔑 required by rules
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
    title:   data.title  || '',
    text:    data.text   || '',
    images:  data.images || [],
    cheers:  0,
    likedBy: [],
    comments: [],
    createdAt: serverTimestamp(),
  };

  if (!user) {
    // Local fallback for guests
    const list = lsGet();
    const item = { id: `local-${Date.now()}`, ...payload, createdAt: Date.now() };
    list.unshift(item);
    lsSet(list);
    return item.id;
  }

  const refDoc = await addDoc(postsCol(user.uid), payload);
  return refDoc.id;
}

/** -----------------------------------------------------------
 * Toggle like/cheer
 * NOTE: works for "my posts". If in future you show others' posts,
 *       call toggleCheerOnPost(id, ownerUid) with the post owner uid.
 * ---------------------------------------------------------- */
export async function toggleCheerOnPost(id, ownerUid) {
  await authReady;
  const me = auth.currentUser;
  if (!me) return;

  const owner = ownerUid || me.uid; // current user by default
  const refDoc = doc(db, 'users', owner, 'socialPosts', id);
  const snap = await getDoc(refDoc);
  if (!snap.exists()) return;

  const data = snap.data() || {};
  const likedBy = Array.isArray(data.likedBy) ? data.likedBy : [];
  const has = likedBy.includes(me.uid);

  await updateDoc(refDoc, {
    cheers:  increment(has ? -1 : 1),
    likedBy: has ? likedBy.filter((x) => x !== me.uid) : [...likedBy, me.uid],
  });

  // Log activity for the OWNER feed (so Profile → "אהבתי/הגבתי" shows it)
  try {
    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, '0');
    const dateKey = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const time    = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

    const title =
      data.title || (data.text ? String(data.text).slice(0, 60) : 'ללא כותרת');

    await logSocialActivity(owner, 'like', {
      postId: id,
      title,
      dateKey,
      time,
    });
  } catch (e) {
    // non-blocking
    console.warn('[social] log like failed:', e);
  }
}

/** -----------------------------------------------------------
 * Add a comment
 * NOTE: supports commenting your own posts. For others' posts,
 *       pass ownerUid: addCommentToPost(id, { text, ownerUid })
 * ---------------------------------------------------------- */
export async function addCommentToPost(id, comment) {
  await authReady;
  const me = auth.currentUser;

  const owner = comment.ownerUid || me?.uid; // default to me
  const refDoc = doc(db, 'users', owner, 'socialPosts', id);

  const payload = {
    text: comment.text || '',
    author:
      comment.author ||
      localStorage.getItem('firstName') ||
      me?.displayName ||
      me?.email ||
      'אורח',
    avatar:
      comment.avatar ||
      localStorage.getItem('profile.avatar') ||
      localStorage.getItem('profile.avatarUrl') ||
      localStorage.getItem('avatarUrl') ||
      '',
    authorUid: me?.uid || null,
    createdAt: serverTimestamp(),
  };

  await updateDoc(refDoc, { comments: arrayUnion(payload) });

  // Log activity for OWNER
  try {
    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, '0');
    const dateKey = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const time    = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

    const snap = await getDoc(refDoc);
    const data = snap.data() || {};
    const title =
      data.title || (data.text ? String(data.text).slice(0, 60) : 'ללא כותרת');

    await logSocialActivity(owner, 'comment', {
      postId: id,
      title,
      text: payload.text,
      dateKey,
      time,
    });
  } catch (e) {
    console.warn('[social] log comment failed:', e);
  }
}

/** -----------------------------------------------------------
 * Upload an image for a post to: /users/{uid}/social/{timestamp}_{name}
 * ---------------------------------------------------------- */
export async function uploadPostImage(file) {
  await authReady;
  const me = auth.currentUser;
  if (!me) throw new Error('no user');
  const storage = getStorage();
  const path = `users/${me.uid}/social/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

/** -----------------------------------------------------------
 * Delete a post (your original)
 * ---------------------------------------------------------- */
export async function deletePost(id) {
  await authReady;
  const me = auth.currentUser;
  if (!me) {
    const list = lsGet().filter((p) => p.id !== id);
    lsSet(list);
    return;
  }
  await deleteDoc(doc(db, 'users', me.uid, 'socialPosts', id));
}

/** For profile page compatibility if needed */
export function getLocalSocialActivity() {
  return { likes: [], comments: [], posts: lsGet() };
}
