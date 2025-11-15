// /src/services/userSearch.service.js
// Search other LooZ users by name / handle and render results
// under the lemon search bar.

// Firestore
import { db } from '../core/firebase.js';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';

const USERS_COL = 'users';
const MIN_TERM_LEN = 1;  // how many chars before we start searching
const MAX_RESULTS = 7;

// Normalize a Firestore user doc into a simple object
function normalizeUser(docSnap) {
  const data = docSnap.data() || {};
  const uid = docSnap.id;

  const first = data.firstName || '';
  const last  = data.lastName || '';
  const displayName =
    data.displayName ||
    `${first} ${last}`.trim() ||
    data.email ||
    'משתמש';

  const handle =
    (data.profile && data.profile.handle) ||
    (data.email ? data.email.split('@')[0] : '') ||
    '';

  const avatarUrl =
    data.avatarUrl ||
    data.avatarURL ||
    data.photoURL ||
    data.photoUrl ||
    '';

  return {
    uid,
    displayName,
    handle,
    avatarUrl,
    raw: data,
  };
}

/**
 * searchUsersByPrefix(term)
 * - term: raw string from the input
 * - returns: Promise<Array<{uid,displayName,handle,avatarUrl,raw}>>
 */
export async function searchUsersByPrefix(termRaw) {
  const term = String(termRaw || '').trim().toLowerCase();

  if (!term || term.length < MIN_TERM_LEN) {
    return [];
  }

  const col = collection(db, USERS_COL);

  // Main query: searchTokens contains the lowercase term
  const q = query(
    col,
    where('searchTokens', 'array-contains', term),
    orderBy('__name__'),
    limit(MAX_RESULTS)
  );

  const snap = await getDocs(q);

  const docs = snap.docs || [];
  const users = docs.map(normalizeUser);

  // Just for debugging in console:
  console.log(
    '[userSearch] term =',
    term,
    'docs =',
    docs.length,
    'matches =',
    users.length
  );

  return users;
}

/* ---------------------------------------------------
   UI helpers – results under the lemon search bar
--------------------------------------------------- */

function ensureResultsHost(inputEl) {
  if (!inputEl) return null;
  const dock = inputEl.closest('.c-dock');
  if (!dock) return null;

  let host = dock.querySelector('.c-dock__results');
  if (!host) {
    host = document.createElement('div');
    host.className = 'c-dock__results';
    host.setAttribute('role', 'listbox');
    host.hidden = true;
    dock.appendChild(host);
  }
  return host;
}

function renderResults(inputEl, users) {
  const host = ensureResultsHost(inputEl);
  if (!host) return;

  if (!users || !users.length) {
    host.innerHTML = '';
    host.hidden = true;
    return;
  }

  host.innerHTML = users
    .map((u) => {
      const safeName = (u.displayName || '').replace(/</g, '&lt;');
      const safeHandle = (u.handle || '').replace(/</g, '&lt;');
      const avatar = u.avatarUrl || '';

      return `
        <button
          type="button"
          class="c-searchuser"
          role="option"
          data-user-id="${u.uid}"
          data-user-handle="${safeHandle}"
          data-user-name="${safeName}"
        >
          <span class="c-searchuser__avawrap">
            ${
              avatar
                ? `<img class="c-searchuser__ava" src="${avatar}" alt="">`
                : `<span class="c-searchuser__ava c-searchuser__ava--placeholder">👤</span>`
            }
          </span>
          <span class="c-searchuser__text">
            <span class="c-searchuser__name">${safeName}</span>
            ${
              safeHandle
                ? `<span class="c-searchuser__handle">@${safeHandle}</span>`
                : ''
            }
          </span>
        </button>
      `;
    })
    .join('');

  host.hidden = false;
}

/**
 * attachUserSearch(inputEl, options?)
 * Binds the lemon search input to Firestore search and
 * renders dropdown results.
 */
export function attachUserSearch(inputEl, options = {}) {
  if (!inputEl || inputEl.__loozUserSearchBound) return;
  inputEl.__loozUserSearchBound = true;

  const minLen = options.minLength ?? MIN_TERM_LEN;
  let lastTerm = '';
  let timer = null;

  const onInput = () => {
    const term = inputEl.value.trim();
    if (term === lastTerm) return;
    lastTerm = term;

    if (timer) clearTimeout(timer);

    if (!term || term.length < minLen) {
      renderResults(inputEl, []);
      return;
    }

    timer = setTimeout(async () => {
      try {
        const users = await searchUsersByPrefix(term);
        renderResults(inputEl, users);
      } catch (err) {
        console.warn('[userSearch] search failed', err);
        renderResults(inputEl, []);
      }
    }, 180);
  };

  inputEl.addEventListener('input', onInput);

  // Handle click on a result
  const dock = inputEl.closest('.c-dock');
  if (dock && !dock.__loozUserSearchClickBound) {
    dock.__loozUserSearchClickBound = true;

    dock.addEventListener('click', (e) => {
      const btn = e.target.closest('.c-searchuser');
      if (!btn) return;

      const uid    = btn.getAttribute('data-user-id');
      const handle = btn.getAttribute('data-user-handle') || '';
      const name   = btn.getAttribute('data-user-name') || handle || uid;

      // Save selection so /social can use it later
      try {
        localStorage.setItem(
          'userSearch.lastSelected',
          JSON.stringify({ uid, handle, name })
        );
      } catch {}

      // Optional: clear dropdown
      const input = dock.querySelector('#lemonSearch');
      if (input) {
        input.blur();
      }
      const resHost = dock.querySelector('.c-dock__results');
      if (resHost) {
        resHost.hidden = true;
      }

      // Navigate to social – later we can auto-focus that user’s posts
      location.hash = '#/social';
    });
  }
}

/* ---------------------------------------------------
   Auto-init for the lemon search bar
--------------------------------------------------- */

let autoTimer = null;

function tryAutoAttach() {
  const input = document.getElementById('lemonSearch');
  if (input) {
    attachUserSearch(input);
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }
}

// Home shell is mounted after DOMContentLoaded, so we poll a bit.
export function ensureUserSearchWired() {
  if (autoTimer) return;
  autoTimer = setInterval(tryAutoAttach, 300);
}

// kick it off immediately on load
ensureUserSearchWired();
