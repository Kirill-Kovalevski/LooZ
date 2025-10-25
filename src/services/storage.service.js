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
  if (!file.type?.startsWith?.('image/')) {
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
 * @param {string=} prevPath - optional previous path to delete (after successful upload)
 * @returns {Promise<{url:string, path:string}>}
 */
export async function uploadUserImage(uid, kind, file, prevPath) {
  if (!uid) throw new Error('User not logged in');

  try {
    // choose extension from MIME type
    const mime = file.type || 'image/jpeg';
    let ext = (mime.split('/')[1] || 'jpeg').toLowerCase();
    if (ext === 'jpeg') ext = 'jpg'; // normalize

    const path = `users/${uid}/${kind}-${Date.now()}.${ext}`;
    const fileRef = ref(storage, path);

    // include metadata (content type + cache)
    const metadata = {
      contentType: mime,
      cacheControl: 'public, max-age=604800, s-maxage=604800' // 7 days
    };

    // upload
    await uploadBytes(fileRef, file, metadata);

    // retrieve a download URL
    const url = await getDownloadURL(fileRef);

    // delete the previous object *after* a successful upload
    if (prevPath) {
      try {
        await deleteObject(ref(storage, prevPath));
      } catch (_) {
        // ignore if old file missing or already deleted
      }
    }

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
    console.warn('[deleteUserFile]', err?.message || err);
  }
}
