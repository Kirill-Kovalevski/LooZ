// /src/services/storage.service.js
// Handles file uploads, image checks, and URL retrieval for LooZ
// --------------------------------------------------

import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { storage } from '../core/firebase.js';

/**
 * Validate selected image before upload.
 * Checks type and size (up to 5MB by default).
 */
export function assertImageAcceptable(file, type = 'avatar') {
  const maxSizeMB = 5;
  if (!file) throw new Error('לא נבחר קובץ');
  if (!file.type.startsWith('image/')) {
    throw new Error('אנא בחר/י קובץ תמונה בלבד');
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`הקובץ גדול מדי (מקסימום ${maxSizeMB}MB)`);
  }
  return true;
}

/**
 * Upload an image for a user.
 * @param {string} uid - The user's UID
 * @param {string} kind - 'avatar' | 'cover' | other
 * @param {File|Blob} file
 * @param {string=} prevPath - optional previous path to delete
 * @returns {Promise<{url:string, path:string}>}
 */
export async function uploadUserImage(uid, kind, file, prevPath) {
  try {
    // Remove previous version if provided
    if (prevPath) {
      const oldRef = ref(storage, prevPath);
      try { await deleteObject(oldRef); } catch (_) {}
    }

    const path = `users/${uid}/${kind}-${Date.now()}.jpg`;
    const fileRef = ref(storage, path);

    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    return { url, path };
  } catch (err) {
    console.error('[uploadUserImage]', err);
    throw err;
  }
}

/**
 * Delete an uploaded user file (e.g., old cover/avatar)
 */
export async function deleteUserFile(path) {
  if (!path) return;
  try {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
  } catch (err) {
    console.warn('[deleteUserFile]', err.message);
  }
}