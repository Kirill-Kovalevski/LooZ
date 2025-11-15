// /src/pages/profile.js
// LooZ profile page with:
// - stacked 7-day bars (done vs removed) + info strip
// - archive tabs + range chips that stay open
// - animated delete / animated recover (flip -> ✓ -> row disappears)
// - social activity: FULL-WIDTH DROPDOWNS (likes / comments)
// - Firestore follow + task audit
// - Firestore task mirror (active/done/removed/deleted)
// - cover/avatar clickable (no camera icons)
// - followers/following DROPDOWN with full lists
// - shared helpers for greeting name on home page
// - gamified task-counter with levels + tiny animation
// - follower "new" badge when count increased since last seen

import { auth, authReady, db } from '../core/firebase.js';
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
} from 'firebase/firestore';

import { uploadUserImage, assertImageAcceptable } from '../services/storage.service.js';
import { saveUserProfile } from '../services/firestore.service.js';
import { escapeHTML, bust, cssUrlSafe } from '../utils/sanitize.js';
import profileLogo from '../icons/profile-logo.png';
import {
  _getAllActive,
  _getAllDone,
  _getAllRemoved,
  permaDelete,
  addEvent,
} from '../utils/events.js';
import { getSocialActivity } from '../pages/social.js';

const $ = (s, r = document) => r.querySelector(s);

const K = {
  AVATAR:      'profile.avatar',
  AVATAR_PATH: 'profile.avatarPath',
  COVER:       'profile.cover',
  COVER_PATH:  'profile.coverPath',
  NAME:        'firstName',
  SUR:         'lastName',
  DISPLAY:     'displayName',
  HANDLE:      'profile.handle',
  FOLLOWERS:   'profile.followers',
  FOLLOWING:   'profile.following',
  THEME:       'profile.theme',
  DEF_VIEW:    'profile.defaultView',
  TASK_LEVEL:  'profile.taskLevel',  // gamified task level
};

const LS_PREFIX = 'looz';
const curUid = () => auth.currentUser?.uid || 'guest';

/* -------------------------------------------------------------
   LS helpers
   - profile data is keyed by "profile:<uid>:<key>"
   - follow data is keyed by "follow:<viewerUid>:<targetUid>"
------------------------------------------------------------- */

const profileKey = (uid, k) => `${LS_PREFIX}:profile:${uid || 'guest'}:${k}`;
const lsProfileGet = (uid, k) => localStorage.getItem(profileKey(uid, k));
const lsProfileSet = (uid, k, v) => localStorage.setItem(profileKey(uid, k), v ?? '');

const followKey = (viewerUid, targetUid) =>
  `${LS_PREFIX}:follow:${viewerUid || 'guest'}:${targetUid || 'guest'}`;
const lsFollowGet = (viewerUid, targetUid) =>
  localStorage.getItem(followKey(viewerUid, targetUid));
const lsFollowSet = (viewerUid, targetUid, v) =>
  localStorage.setItem(followKey(viewerUid, targetUid), v ?? '');

// "last seen followers" per viewer → for the little badge
const seenFollowersKey = (viewerUid, targetUid) =>
  `${LS_PREFIX}:seenFollowers:${viewerUid || 'guest'}:${targetUid || 'guest'}`;
const lsSeenFollowersGet = (viewerUid, targetUid) =>
  localStorage.getItem(seenFollowersKey(viewerUid, targetUid));
const lsSeenFollowersSet = (viewerUid, targetUid, v) =>
  localStorage.setItem(seenFollowersKey(viewerUid, targetUid), v ?? '');

const pad2 = (n) => String(n).padStart(2, '0');
const keyOf = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/* -------------------------------------------------------------
   Gamified task levels
------------------------------------------------------------- */

// "Challenging" but reachable steps.
// min = inclusive threshold.
const TASK_LEVELS = [
  {
    min: 0,
    name: 'מתחילים',
    bg: 'linear-gradient(180deg, #ffffff, #f9fafb)',
    border: '#e5e7eb',
    shadow: '0 6px 14px rgba(15,23,42,.06)',
  },
  {
    min: 5,
    name: 'על ההתחלה',
    bg: 'linear-gradient(180deg, #ecfeff, #cffafe)',
    border: '#22d3ee',
    shadow: '0 8px 18px rgba(34,211,238,.30)',
  },
  {
    min: 15,
    name: 'בקצב טוב',
    bg: 'linear-gradient(180deg, #fef9c3, #fde68a)',
    border: '#facc15',
    shadow: '0 10px 20px rgba(250,204,21,.35)',
  },
  {
    min: 40,
    name: 'על אש גבוהה',
    bg: 'linear-gradient(180deg, #fee2e2, #fecaca)',
    border: '#f97373',
    shadow: '0 12px 24px rgba(248,113,113,.40)',
  },
  {
    min: 80,
    name: 'אגדה חיה',
    bg: 'linear-gradient(180deg, #f5f3ff, #ddd6fe)',
    border: '#8b5cf6',
    shadow: '0 14px 26px rgba(139,92,246,.45)',
  },
];

function computeTaskLevel(total) {
  let idx = 0;
  for (let i = 0; i < TASK_LEVELS.length; i++) {
    if (total >= TASK_LEVELS[i].min) idx = i;
  }
  return idx;
}

let taskLevelCssInjected = false;
function ensureTaskLevelCSS() {
  if (taskLevelCssInjected) return;
  taskLevelCssInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes ppTaskLevelPop {
      0%   { transform: translateY(0) scale(1); box-shadow: 0 6px 14px rgba(15,23,42,.12); }
      40%  { transform: translateY(-4px) scale(1.07); box-shadow: 0 14px 26px rgba(250,204,21,.65); }
      100% { transform: translateY(0) scale(1); box-shadow: 0 6px 14px rgba(15,23,42,.12); }
    }
  `;
  document.head.appendChild(style);
}

function decorateTaskBadge(el, total, levelIdx, levelUp) {
  if (!el) return;
  ensureTaskLevelCSS();

  const lvl = TASK_LEVELS[levelIdx] || TASK_LEVELS[0];

  el.style.background = lvl.bg;
  el.style.borderColor = lvl.border;
  el.style.boxShadow = lvl.shadow;
  el.style.transition = 'transform .16s ease, box-shadow .16s ease';
  el.title = `${lvl.name} · ${total} משימות שהושלמו`;

  if (levelUp) {
    el.style.animation = 'ppTaskLevelPop 520ms cubic-bezier(.2,.8,.2,1)';
    setTimeout(() => {
      if (el.isConnected) el.style.animation = '';
    }, 560);
  }
}

/* -------------------------------------------------------------
   Viewing context helpers (supports viewing another user's profile)
------------------------------------------------------------- */

let forcedUid = null; // if set, we are explicitly viewing that user

function viewedUid() {
  if (forcedUid) return forcedUid;

  try {
    const hash = window.location.hash || '';
    const [, query = ''] = hash.split('?');
    if (query) {
      const params = new URLSearchParams(query);
      const uidFromUrl = params.get('uid');
      if (uidFromUrl) return uidFromUrl;
    }
  } catch {
    // ignore URL parsing errors
  }

  return curUid();
}

function isViewingSelf() {
  const v = viewedUid();
  const c = curUid();
  return v && c && v === c;
}

/* -------------------------------------------------------------
   1. Firestore → LS (per viewed UID)
------------------------------------------------------------- */
async function hydrateProfileFromFirestore() {
  const uid = viewedUid(); // who we want to show
  if (!uid || uid === 'guest') return;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return;
    const d = snap.data() || {};

    if (d.avatarUrl) lsProfileSet(uid, K.AVATAR, d.avatarUrl);
    if (d.avatarPath) lsProfileSet(uid, K.AVATAR_PATH, d.avatarPath);
    if (d.coverUrl) lsProfileSet(uid, K.COVER, d.coverUrl);
    if (d.coverPath) lsProfileSet(uid, K.COVER_PATH, d.coverPath);

    if (d.displayName) lsProfileSet(uid, K.DISPLAY, d.displayName);
    if (d.firstName) lsProfileSet(uid, K.NAME, d.firstName);
    if (d.lastName) lsProfileSet(uid, K.SUR, d.lastName);
    if (d.profile?.handle) lsProfileSet(uid, K.HANDLE, d.profile.handle);

    if (Number.isFinite(d.followers))
      lsProfileSet(uid, K.FOLLOWERS, String(d.followers));
    if (Number.isFinite(d.following))
      lsProfileSet(uid, K.FOLLOWING, String(d.following));

    if (d.theme) lsProfileSet(uid, K.THEME, d.theme);
    if (d.defaultView) lsProfileSet(uid, K.DEF_VIEW, d.defaultView);
  } catch (err) {
    console.warn('[profile] hydrateProfileFromFirestore failed', err);
  }
}

/* -------------------------------------------------------------
   2. image helpers
------------------------------------------------------------- */
async function downscaleImage(file, max = 1400) {
  if (!file || !/^image\//.test(file.type)) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (scale === 1) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((res) =>
    canvas.toBlob(res, 'image/jpeg', 0.9),
  );
  return blob || file;
}
function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

/* -------------------------------------------------------------
   3. stats (7 fixed days)
------------------------------------------------------------- */
function getStats() {
  const active = _getAllActive?.() || [];
  const done = _getAllDone?.() || [];
  const removed = _getAllRemoved?.() || [];
  const total = active.length + done.length + removed.length;

  const today = new Date();
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return { date: d, done: 0, removed: 0 };
  });

  const pour = (arr, kind) => {
    for (const it of arr) {
      const t = new Date(
        it.completedAt || it.removedAt || it.date || Date.now(),
      );
      const diff = Math.floor((today - t) / 86400000);
      if (diff >= 0 && diff < 7) {
        const idx = 6 - diff;
        buckets[idx][kind] += 1;
      }
    }
  };

  pour(done, 'done');
  pour(removed, 'removed');

  return { total, done: done.length, del: removed.length, buckets };
}

/* -------------------------------------------------------------
   4. graph
------------------------------------------------------------- */
function graphHTML(stats) {
  const COLORS = {
    done: '#7060ff',
    removed: '#e46d5c',
  };

  const W = 320;
  const H = 160;
  const PAD_X = 16;
  const PAD_TOP = 32;
  const PAD_BOTTOM = 44;
  const barAreaW = W - PAD_X * 2;
  const buckets = stats.buckets;
  const maxVal = Math.max(1, ...buckets.map((b) => b.done + b.removed));
  const barW = 28;
  const gap =
    buckets.length > 1
      ? (barAreaW - barW * buckets.length) / (buckets.length - 1)
      : 0;

  let bars = '';
  buckets.forEach((b, idx) => {
    const x = PAD_X + idx * (barW + gap);
    const scale = (H - PAD_TOP - PAD_BOTTOM) / maxVal;
    const hRemoved = b.removed * scale;
    const hDone = b.done * scale;
    const baseY = H - PAD_BOTTOM;
    const yRemoved = baseY - (hRemoved || 6);
    const yDone = yRemoved - (hDone || 6);
    const dd = pad2(b.date.getDate());
    const mm = pad2(b.date.getMonth() + 1);

    bars += `
      <g class="pp-bar" transform="translate(${x},0)">
        <rect x="0" y="${PAD_TOP}" width="${barW}" height="${
      H - PAD_TOP - PAD_BOTTOM
    }" rx="14" fill="rgba(126,146,186,0.03)"></rect>

        <rect x="1.5" y="${yRemoved}" width="${
      barW - 3
    }" height="${hRemoved || 6}" rx="10"
          style="fill:${COLORS.removed};filter:drop-shadow(0 6px 10px rgba(228,109,92,0.28));"></rect>

        <rect x="1.5" y="${yDone}" width="${
      barW - 3
    }" height="${hDone || 6}" rx="10"
          style="fill:${COLORS.done};filter:drop-shadow(0 6px 10px rgba(112,96,255,0.3));"></rect>

        <rect x="0" y="${PAD_TOP}" width="${barW}" height="${
      H - PAD_TOP - PAD_BOTTOM
    }"
          fill="transparent"
          class="pp-barhit"
          data-date="${dd}.${mm}"
          data-done="${b.done}"
          data-removed="${b.removed}"></rect>

        <text x="${barW / 2}" y="${
      H - 16
    }" text-anchor="middle" class="pp-xlbl">${dd}.${mm}</text>
      </g>
    `;
  });

  return `
    <div class="pp-graphcard" dir="rtl">
      <div class="pp-graphhead">
        <div class="pp-grtitle">פעילות</div>
        <div class="pp-grsubtitle">בשבעת הימים האחרונים</div>
      </div>
      <svg class="pp-svg" viewBox="0 0 ${W} ${H}" width="100%" height="${H}">
        <line x1="${PAD_X}" y1="${H - PAD_BOTTOM}" x2="${
    W - PAD_X
  }" y2="${H - PAD_BOTTOM}" class="pp-grid"></line>
        ${bars}
      </svg>
      <div class="pp-legendrow" dir="rtl">
        <span class="pp-legitem"><i class="pp-dot pp-dot--done" style="background:${
          COLORS.done
        }"></i>בוצעו</span>
        <span class="pp-legitem"><i class="pp-dot pp-dot--removed" style="background:${
          COLORS.removed
        }"></i>בוטלו</span>
      </div>
      <div class="pp-barinfo" id="ppBarInfo" aria-live="polite"></div>
    </div>
  `;
}
function sparklessCounters(stats, levelInfo = {}) {
  const total = stats.total;
  const done = stats.done;
  const del = stats.del;

  const doneTotal = levelInfo.doneTotal ?? done;
  const levelIdx = levelInfo.levelIdx ?? computeTaskLevel(doneTotal);
  const levelUp = !!levelInfo.levelUp;

  const lvl = TASK_LEVELS[levelIdx] || TASK_LEVELS[0];
  const next = TASK_LEVELS[levelIdx + 1] || null;

  let progress = 1;
  if (next) {
    const span = Math.max(1, next.min - lvl.min);
    progress = Math.max(0, Math.min(1, (doneTotal - lvl.min) / span));
  }
  const pct = Math.round(progress * 100);

  const steps = 6;
  const filledSteps = Math.max(
    0,
    Math.min(steps, Math.round(progress * steps)),
  );
  const stepsHtml = Array.from({ length: steps }, (_, i) => {
    const filled = i < filledSteps;
    const bg = filled ? 'rgba(34,197,94,.95)' : 'rgba(15,23,42,.10)';
    return `<span style="flex:1;height:4px;border-radius:999px;background:${bg};"></span>`;
  }).join('');
  return `
    <section class="pp-card pp-stats" aria-label="סטטיסטיקה">
      <div class="pp-statrow">
        <!-- simple total / deleted stats -->
        <div class="pp-stat">
          <span class="pp-num">${total}</span>
          <span class="pp-lbl">סה״כ</span>
        </div>

        <!-- GAME-LIKE COMPLETED TASKS BADGE – now DEAD CENTER -->
        <div class="pp-stat pp-stat--doneLevel"
             data-task-done="${doneTotal}"
             data-task-level="${levelIdx}"
             ${levelUp ? 'data-level-up="1"' : ''}>
          <span class="pp-num">${doneTotal}</span>
          <span class="pp-lbl">משימות שהושלמו</span>
          <div class="pp-mini-label">${lvl.name}</div>
          <div class="pp-mini-gauge"
               style="display:flex;gap:4px;margin-top:4px;width:100%;">
            ${stepsHtml}
          </div>
          ${
            next
              ? `<div class="pp-mini-next" style="margin-top:4px;font-size:11px;opacity:.75;">
                   עוד ${Math.max(0, next.min - doneTotal)} משימות לרמה הבאה
                 </div>`
              : `<div class="pp-mini-next" style="margin-top:4px;font-size:11px;opacity:.75;">
                   הגעת לרמה המקסימלית
                 </div>`
          }
        </div>

        <div class="pp-stat">
          <span class="pp-num">${del}</span>
          <span class="pp-lbl">בוטלו</span>
        </div>
      </div>
      <div id="ppGraphSlot"></div>
    </section>
  `;
        }


/* -------------------------------------------------------------
   5. archives
------------------------------------------------------------- */
function liRow(t, kind) {
  const time = escapeHTML((t.time || '00:00').trim());
  const title = escapeHTML((t.title || 'ללא כותרת').trim());
  const dim = kind === 'done' ? ' is-archived' : '';
  return `
    <li class="pp-taskli${dim}" dir="rtl">
      <span class="pp-time" dir="ltr">${time}</span>
      <span class="pp-title">${title}</span>
      <span class="pp-actions" dir="ltr">
        <button class="pp-repeat"  title="חזור על המשימה" data-repeat data-id="${String(
          t.id,
        )}" data-kind="${kind}" aria-label="חזור">↻</button>
        <button class="pp-delperm" title="מחק לצמיתות"    data-delperm data-id="${String(
          t.id,
        )}" data-kind="${kind}" aria-label="מחק">🗑</button>
      </span>
    </li>
  `;
}
function groupByDateThenTime(list) {
  const map = new Map();
  for (const t of list) {
    const d = new Date(t.completedAt || t.removedAt || t.date || Date.now());
    const k = keyOf(d);
    (map.get(k) || map.set(k, []).get(k)).push(t);
  }
  for (const [, arr] of map)
    arr.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}
function dateSection(dateKey, arr, kind) {
  const [y, m, d] = dateKey.split('-');
  const nice = `${d}.${m}`;
  return `
    <details class="pp-dsec" open dir="rtl" data-date-key="${dateKey}">
      <summary class="pp-dsum">
        <span class="pp-dlabel" dir="ltr">${escapeHTML(nice)}</span>
        <span class="pp-dcount">(${arr.length})</span>
      </summary>
      <ul class="pp-list">
        ${arr.map((t) => liRow(t, kind)).join('')}
      </ul>
    </details>
  `;
}
function archivesHTML(range = 'today') {
  const doneRaw = _getAllDone?.() || [];
  const removedRaw = _getAllRemoved?.() || [];

  const dayStart = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const now = new Date(),
    today0 = dayStart(now);
  const ranges = {
    today: { from: today0, to: new Date(+today0 + 86400000) },
    yesterday: { from: new Date(+today0 - 86400000), to: today0 },
    '7d': { from: new Date(+today0 - 6 * 86400000), to: new Date(+today0 + 86400000) },
    '30d': {
      from: new Date(+today0 - 29 * 86400000),
      to: new Date(+today0 + 86400000),
    },
  };
  const r = ranges[range] || ranges.today;
  const inRange = (ts) => ts >= r.from && ts < r.to;

  const done = doneRaw.filter((t) =>
    inRange(new Date(t.completedAt || t.date || Date.now())),
  );
  const removed = removedRaw.filter((t) =>
    inRange(new Date(t.removedAt || t.date || Date.now())),
  );

  const doneGroups = groupByDateThenTime(done);
  const removedGroups = groupByDateThenTime(removed);

  return `
    <section class="pp-card" aria-label="ארכיונים">
      <div class="pp-arch-head" role="tablist" dir="rtl">
        <button class="pp-arch-toggle is-active" data-toggle="done"    aria-selected="true"  role="tab">היסטוריית משימות שבוצעו</button>
        <button class="pp-arch-toggle"            data-toggle="removed" aria-selected="false" role="tab">היסטוריית משימות שבוטלו</button>
      </div>

      <div class="pp-rangebar" dir="rtl" role="group" aria-label="טווח מהיר">
        <button class="pp-range is-active" data-range="today">היום</button>
        <button class="pp-range"           data-range="yesterday">אתמול</button>
        <button class="pp-range"           data-range="7d">7 ימים</button>
        <button class="pp-range"           data-range="30d">30 ימים</button>
      </div>

      <div class="pp-arch" data-arch="done">
        ${
          doneGroups.length
            ? doneGroups
                .map(([dk, arr]) => dateSection(dk, arr, 'done'))
                .join('')
            : `<div class="pp-emptyli">אין משימות שבוצעו בטווח זה</div>`
        }
        <div class="pp-summary" dir="rtl">סה״כ: <b>${done.length}</b></div>
      </div>

      <div class="pp-arch" data-arch="removed" hidden>
        ${
          removedGroups.length
            ? removedGroups
                .map(([dk, arr]) => dateSection(dk, arr, 'removed'))
                .join('')
            : `<div class="pp-emptyli">אין משימות שבוטלו בטווח זה</div>`
        }
        <div class="pp-summary" dir="rtl">סה״כ: <b>${removed.length}</b></div>
      </div>
    </section>
  `;
}

/* -------------------------------------------------------------
   6. social activity — dropdown accordions (full width)
------------------------------------------------------------- */
function formatHebDateKey(dateKey) {
  if (!dateKey) return '';
  const [y, m, d] = String(dateKey).split('-');
  if (!y || !m || !d) return escapeHTML(dateKey);
  return `${d}.${m}.${y}`;
}
function socialActivityHTML() {
  const isLoggedIn = !!auth.currentUser;
  if (!isLoggedIn) return '';

  const { likes = [], comments = [] } = getSocialActivity() || {};
  const likeCount = likes.length;
  const commentCount = comments.length;

  const makeRow = (e) => {
    const hhmm = escapeHTML(e.time || '');
    const dstr = formatHebDateKey(e.dateKey || '');
    return `
      <li class="pp-soc-card" data-post-id="${escapeHTML(e.postId || '')}">
        <div class="pp-soc-card-body">
          <div class="pp-soc-title">${escapeHTML(e.title || 'ללא כותרת')}</div>
          ${
            e.text
              ? `<div class="pp-soc-note">${escapeHTML(e.text.slice(0, 80))}</div>`
              : ''
          }
        </div>
        <div class="pp-soc-stamp" dir="ltr" aria-label="${dstr} ${hhmm}">
          <span class="pp-stamp-time">${hhmm}</span>
          <span class="pp-stamp-date">${dstr}</span>
        </div>
      </li>
    `;
  };

  return `
    <section class="pp-card pp-socialcard" aria-label="פעילות חברתית">
      <h3 class="pp-h3">פעילות חברתית</h3>

      <details class="pp-acc" data-acc="likes">
        <summary class="pp-acc-btn" dir="rtl">
          <span>אהבתי</span>
          <span class="pp-acc-count">${likeCount}</span>
        </summary>
        <ul class="pp-soc-list">
          ${
            likeCount
              ? likes.map(makeRow).join('')
              : `<li class="pp-actempty">אין אהודות עדיין</li>`
          }
        </ul>
      </details>

      <details class="pp-acc" data-acc="comments">
        <summary class="pp-acc-btn" dir="rtl">
          <span>הגבתי</span>
          <span class="pp-acc-count">${commentCount}</span>
        </summary>
        <ul class="pp-soc-list">
          ${
            commentCount
              ? comments.map(makeRow).join('')
              : `<li class="pp-actempty">אין תגובות עדיין</li>`
          }
        </ul>
      </details>

      <p class="pp-soc-foot">לחיצה על פריט תעביר למסך החברתי.</p>
    </section>
  `;
}

/* -------------------------------------------------------------
   7. name + handle + shared helpers for greeting
------------------------------------------------------------- */

export function formatGreetingName(rawFirst, rawLast) {
  const first = (rawFirst || '').trim();
  const last = (rawLast || '').trim();

  if (!first && !last) return '';
  if (!last) return first;

  const initial = ([...last][0] || '').trim();
  if (!initial) return first;

  const RLM = '\u200F'; // right-to-left mark
  const decoratedInitial = `${initial}${RLM}.`;
  return `${first} ${decoratedInitial}`;
}

export function getScopedNamesForUid(uid = viewedUid()) {
  const firstName = lsProfileGet(uid, K.NAME) || '';
  const lastName = lsProfileGet(uid, K.SUR) || '';
  const displayName = lsProfileGet(uid, K.DISPLAY) || '';
  return { firstName, lastName, displayName };
}

function getBestDisplayName() {
  const vUid = viewedUid();
  const { firstName, lastName, displayName } = getScopedNamesForUid(vUid);

  if (displayName) {
    return escapeHTML(displayName);
  }
  if (firstName || lastName) {
    return escapeHTML([firstName, lastName].filter(Boolean).join(' '));
  }

  if (isViewingSelf()) {
    const u = auth.currentUser;
    if (u?.displayName) return escapeHTML(u.displayName);
    if (u?.email) return escapeHTML(u.email);
  }

  return 'אורח';
}

function getHandleHTML() {
  const vUid = viewedUid();
  const raw =
    lsProfileGet(vUid, K.HANDLE) ||
    localStorage.getItem('profile.handle') ||
    '';
  const cleaned = (raw || '').trim();
  const looksDefault =
    !cleaned ||
    cleaned === '@looz_user' ||
    cleaned === 'looz_user@' ||
    cleaned.startsWith('looz_user');

  if (looksDefault) return '';
  const withAt = cleaned.startsWith('@') ? cleaned : '@' + cleaned;
  return `<div class="pp-handle">${escapeHTML(withAt)}</div>`;
}

/* -------------------------------------------------------------
   8. render
------------------------------------------------------------- */
function renderProfile() {
  const vUid = viewedUid();
  const cover = lsProfileGet(vUid, K.COVER) || '';
  const avatar = lsProfileGet(vUid, K.AVATAR) || '';

  const viewerUid = curUid();
  const followLS = lsFollowGet(viewerUid, vUid) || '0';
  const isOn = followLS === '1';

  const coverStyle = cover
    ? `--cover:url(${cssUrlSafe(bust(cover))});background-image:var(--cover)`
    : '';

  const isSelf = isViewingSelf();

  const followersNum = Number(lsProfileGet(vUid, K.FOLLOWERS) || '0');
  const followingNum = Number(lsProfileGet(vUid, K.FOLLOWING) || '0');

    const stats = getStats();
  const doneTotal = stats.done; // levels are based on COMPLETED tasks now
  const prevLevel = Number(lsProfileGet(vUid, K.TASK_LEVEL) || '0');
  const levelIdx = computeTaskLevel(doneTotal);
  const levelUp = levelIdx > prevLevel;
  lsProfileSet(vUid, K.TASK_LEVEL, String(levelIdx));


  return `
    <main class="profile-page o-wrap" dir="rtl">
      <header class="topbar">
        <button class="navbtn" data-act="back" aria-label="חזרה">‹</button>
        <h1 class="title">פרופיל</h1>
        <button class="looz-mini-btn" data-act="home" aria-label="עמוד ראשי">
          <img class="looz-mini" src="${profileLogo}" alt="LooZ" />
        </button>
      </header>

      <section class="pp-cover" style="${coverStyle}">
        <input id="ppCoverInput" type="file" accept="image/*" hidden>
      </section>

      <section class="pp-card pp-head">
        <div class="pp-avatarwrap">
          <div class="pp-avatar">
            <img class="pp-avatar__img" src="${bust(avatar || '')}" alt="">
          </div>
          <input id="ppAvatarInput" type="file" accept="image/*" hidden>
        </div>

        <div class="pp-id">
          <div class="pp-name">${getBestDisplayName()}</div>
          ${getHandleHTML()}
        </div>

        <div class="pp-followrow">
          ${
            !isSelf
              ? `<button class="pp-btn pp-btn--follow ${
                  isOn ? 'is-on' : ''
                }" data-act="follow">${isOn ? 'עוקב ✓' : 'עקוב'}</button>`
              : ''
          }
        </div>

        <div class="pp-counters" role="group" aria-label="מונה"
             style="justify-content:center;column-gap:16px;">
          <button class="pp-count" type="button" data-open-follow="followers">
            <b id="ppFollowers">${followersNum}</b>
            <span>עוקבים</span>
            <span id="ppFollowersBadge" hidden></span>
          </button>
          <button class="pp-count" type="button" data-open-follow="following">
            <b id="ppFollowing">${followingNum}</b>
            <span>נעקבים</span>
          </button>
        </div>


        <!-- inline dropdown for followers / following -->
        <div class="pp-followpanel" id="ppFollowPanel" hidden data-current-kind="">
          <section
            class="pp-followpanel__card"
            role="dialog"
            aria-modal="false"
            aria-labelledby="ppFollowPanelTitle"
            style="width:100%;max-width:100%;box-sizing:border-box;margin-inline:0;">
            <header class="pp-followpanel__head">
              <h3 id="ppFollowPanelTitle" class="pp-followpanel__title">עוקבים</h3>
              <button class="pp-followpanel__close" type="button" data-followpanel-close aria-label="סגור">✕</button>
            </header>
            <div class="pp-followpanel__body" data-followpanel-body>
              <div class="pp-followpanel__empty">טוען…</div>
            </div>
          </section>
        </div>
      </section>

           ${sparklessCounters(stats, { levelIdx, levelUp, doneTotal })}
      ${archivesHTML('today')}
      ${socialActivityHTML()}

      <div class="pp-space"></div>
    </main>
  `;
}

/* -------------------------------------------------------------
   9. paint cover
------------------------------------------------------------- */
function paintCoverFromLS(root) {
  const url = lsProfileGet(viewedUid(), K.COVER) || '';
  const $cover = root.querySelector('.pp-cover');
  if (!$cover) return;
  if (url) {
    const painted = `url(${cssUrlSafe(bust(url))})`;
    $cover.style.setProperty('--cover', painted);
    $cover.style.backgroundImage = 'var(--cover)';
  } else {
    $cover.style.removeProperty('--cover');
    $cover.style.removeProperty('background-image');
  }
}

/* -------------------------------------------------------------
   10. mount
------------------------------------------------------------- */
export async function mount(rootOrOptions, maybeUid) {
  let root = null;
  let uidOverride = null;

  if (rootOrOptions instanceof HTMLElement || rootOrOptions === document.body) {
    root = rootOrOptions;
    if (typeof maybeUid === 'string') {
      uidOverride = maybeUid;
    } else if (
      maybeUid &&
      typeof maybeUid === 'object' &&
      typeof maybeUid.uid === 'string'
    ) {
      uidOverride = maybeUid.uid;
    }
  } else if (typeof rootOrOptions === 'string') {
    uidOverride = rootOrOptions;
  } else if (
    rootOrOptions &&
    typeof rootOrOptions === 'object' &&
    typeof rootOrOptions.uid === 'string'
  ) {
    uidOverride = rootOrOptions.uid;
  }

  forcedUid = uidOverride || null;

  await authReady;
  await hydrateProfileFromFirestore();

  const target = root || document.getElementById('app') || document.body;
  target.innerHTML = renderProfile();

  paintCoverFromLS(target);
  wire(target);
}
export default { mount };

/* -------------------------------------------------------------
   Micro feedback for action buttons
------------------------------------------------------------- */
function markBusy(btn) {
  btn?.classList.add('is-busy');
}
function markDone(btn) {
  if (!btn || !btn.isConnected) return;

  btn.classList.remove('is-busy');

  if (btn.hasAttribute('data-repeat')) {
    btn.classList.add('pp-btn-flip');
    setTimeout(() => {
      if (!btn.isConnected) return;
      btn.textContent = '✓';
      btn.classList.add('is-done');
      btn.setAttribute('aria-label', 'שוחזר ✓');
    }, 200);
  } else {
    btn.textContent = '✓';
    btn.classList.add('is-done');
    btn.setAttribute('aria-label', 'נמחק ✓');
  }
  setTimeout(() => btn.isConnected && btn.classList.remove('is-done'), 1100);
}

/* -------------------------------------------------------------
   10.5 Firestore Task Mirror helpers
------------------------------------------------------------- */
async function upsertTaskDoc(uid, t, status) {
  if (!uid || !db || !t) return;
  const taskId = String(
    t.id ?? t.localId ?? `${t.title}-${t.time ?? ''}-${t.date ?? ''}`,
  );
  const ref = doc(db, 'users', uid, 'tasks', taskId);
  const payload = {
    title: t.title || 'ללא כותרת',
    time: t.time || null,
    date: t.date || null,
    status, // 'active' | 'done' | 'removed'
    updatedAt: new Date(),
  };
  if (status === 'done') payload.completedAt = t.completedAt || new Date();
  if (status === 'removed') payload.removedAt = t.removedAt || new Date();
  await setDoc(ref, payload, { merge: true });
}
async function deleteTaskDoc(uid, id) {
  if (!uid || !db || !id) return;
  await setDoc(
    doc(db, 'users', uid, 'tasks', String(id)),
    { status: 'deleted', deletedAt: new Date() },
    { merge: true },
  );
}

/* -------------------------------------------------------------
   11. wire
------------------------------------------------------------- */
function wire(root) {
  document.body.setAttribute('data-view', 'profile');

  document
    .querySelectorAll('.c-bottom-cta, .c-cta, .btn-create-orb')
    .forEach((el) => (el.style.display = 'none'));

  $('[data-act="back"]', root)?.addEventListener('click', () => history.back());
  $('[data-act="home"]', root)?.addEventListener('click', async () => {
    const { mount } = await import('./home.js');
    mount(document.getElementById('app'));
  });

  // click cover
  root.querySelector('.pp-cover')?.addEventListener('click', () => {
    $('#ppCoverInput', root)?.click();
  });

  // click avatar
  root.querySelector('.pp-avatar')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    $('#ppAvatarInput', root)?.click();
  });

  // cover upload
  $('#ppCoverInput', root)?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      assertImageAcceptable(file, 'cover');
      const user = auth.currentUser;
      const downscaled = await downscaleImage(file, 1600);

      const vUid = viewedUid();

      if (user && vUid === user.uid) {
        const prev = lsProfileGet(vUid, K.COVER_PATH) || undefined;
        const { url, path } = await uploadUserImage(
          user.uid,
          'cover',
          downscaled,
          prev,
        );
        lsProfileSet(vUid, K.COVER, url);
        lsProfileSet(vUid, K.COVER_PATH, path);
        await saveUserProfile?.(user.uid, { coverUrl: url, coverPath: path });
        paintCoverFromLS(root);
      } else {
        const dataUrl = await fileToDataURL(downscaled);
        lsProfileSet(vUid, K.COVER, dataUrl);
        paintCoverFromLS(root);
      }
    } catch (err) {
      console.error('cover upload failed:', err);
    } finally {
      e.target.value = '';
    }
  });

  // avatar upload
  $('#ppAvatarInput', root)?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      assertImageAcceptable(file, 'avatar');
      const user = auth.currentUser;
      const downscaled = await downscaleImage(file, 800);

      const vUid = viewedUid();

      if (user && vUid === user.uid) {
        const prev = lsProfileGet(vUid, K.AVATAR_PATH) || undefined;
        const { url, path } = await uploadUserImage(
          user.uid,
          'avatar',
          downscaled,
          prev,
        );
        lsProfileSet(vUid, K.AVATAR, url);
        lsProfileSet(vUid, K.AVATAR_PATH, path);
        await saveUserProfile?.(user.uid, { avatarUrl: url, avatarPath: path });
        root
          .querySelector('.pp-avatar__img')
          ?.setAttribute('src', bust(url));
      } else {
        const dataUrl = await fileToDataURL(downscaled);
        lsProfileSet(vUid, K.AVATAR, dataUrl);
        root
          .querySelector('.pp-avatar__img')
          ?.setAttribute('src', bust(dataUrl));
      }
    } catch (err) {
      console.error('avatar upload failed:', err);
    } finally {
      e.target.value = '';
    }
  });

  // chart slot
  const slot = root.querySelector('#ppGraphSlot');
  if (slot) {
    const stats = getStats();
    slot.innerHTML = graphHTML(stats);
  }

  // bar click
  root.addEventListener(
    'click',
    (e) => {
      const hit = e.target.closest('.pp-barhit');
      if (!hit) return;
      showBarInfo(hit, root);
    },
  );
  root.addEventListener(
    'touchstart',
    (e) => {
      const hit = e.target.closest('.pp-barhit');
      if (!hit) return;
      showBarInfo(hit, root);
    },
    { passive: true },
  );

  // social rows → social page
  root.querySelectorAll('.pp-soc-card[data-post-id]').forEach((li) => {
    li.addEventListener('click', async () => {
      const pid = li.getAttribute('data-post-id');
      if (!pid) return;
      localStorage.setItem('social.focusPostId', pid);
      const { mount } = await import('./social.js');
      const app = document.getElementById('app') || document.body;
      mount(app);
    });
  });

  // FOLLOW / UNFOLLOW
  {
    const $followBtn = root.querySelector('[data-act="follow"]');
    const $followers = root.querySelector('#ppFollowers');
    const vUid = viewedUid();
    const meUid = auth.currentUser?.uid;

    const paintFollow = () => {
      if (!$followBtn) return;
      const on = (lsFollowGet(meUid, vUid) || '0') === '1';
      $followBtn.classList.toggle('is-on', on);
      $followBtn.textContent = on ? 'עוקב ✓' : 'עקוב';
      $followBtn.setAttribute('aria-pressed', String(on));
    };

    if ($followBtn && $followers && vUid && meUid && vUid !== meUid) {
      paintFollow();

      $followBtn.addEventListener('click', async () => {
        const was = (lsFollowGet(meUid, vUid) || '0') === '1';
        const nextOn = !was;

        lsFollowSet(meUid, vUid, nextOn ? '1' : '0');
        const followersCur = Number($followers.textContent || '0');
        const followersNext = nextOn
          ? followersCur + 1
          : Math.max(0, followersCur - 1);
        $followers.textContent = String(followersNext);
        lsProfileSet(vUid, K.FOLLOWERS, String(followersNext));
        paintFollow();

        try {
          await updateDoc(doc(db, 'users', vUid), { followers: followersNext });
        } catch {
          try {
            await setDoc(
              doc(db, 'users', vUid),
              { followers: followersNext },
              { merge: true },
            );
          } catch {}
        }

        try {
          const meRef = doc(db, 'users', meUid);
          const snap = await getDoc(meRef);
          const meData = snap.exists() ? snap.data() : {};
          const curFollowing = Number(meData.following || 0);
          const followingNext = nextOn
            ? curFollowing + 1
            : Math.max(0, curFollowing - 1);
          await setDoc(meRef, { following: followingNext }, { merge: true });
          const $following = root.querySelector('#ppFollowing');
          if ($following && isViewingSelf())
            $following.textContent = String(followingNext);
          lsProfileSet(meUid, K.FOLLOWING, String(followingNext));
        } catch {}

        try {
      const relRefFollowers = doc(db, 'users', vUid, 'followers', meUid);
const relRefFollowing = doc(db, 'users', meUid, 'following', vUid);

if (nextOn) {
  // FOLLOW → mark as active and explicitly clear __deleted
  await Promise.all([
    setDoc(
      relRefFollowers,
      { uid: meUid, at: new Date(), __deleted: false },
      { merge: true },
    ),
    setDoc(
      relRefFollowing,
      { uid: vUid, at: new Date(), __deleted: false },
      { merge: true },
    ),
  ]);
} else {
  // UNFOLLOW → keep doc but flag as deleted
  await Promise.all([
    setDoc(
      relRefFollowers,
      { __deleted: true, at: new Date() },
      { merge: true },
    ),
    setDoc(
      relRefFollowing,
      { __deleted: true, at: new Date() },
      { merge: true },
    ),
  ]);
}

        } catch {}
      });
    }
  }

  // follower "new" badge helpers (per viewer)
  const vUid = viewedUid();
  const meUid = auth.currentUser?.uid || null;
  const followersCountEl = root.querySelector('#ppFollowers');
  const followersBadgeEl = root.querySelector('#ppFollowersBadge');

   const refreshFollowerBadge = () => {
    if (!meUid || !followersCountEl || !followersBadgeEl) return;

    const current = Number(followersCountEl.textContent || '0');
    const seenRaw = lsSeenFollowersGet(meUid, vUid);
    // if nothing stored yet → treat as 0 so first follower is "new"
const seen = seenRaw == null ? 0 : Number(seenRaw || '0');
const hasNew = current > seen && current > 0;

  

    // basic styling (safe to run more than once)
    followersBadgeEl.style.width = '8px';
    followersBadgeEl.style.height = '8px';
    followersBadgeEl.style.borderRadius = '999px';
    followersBadgeEl.style.background = '#f97316';
    followersBadgeEl.style.boxShadow = '0 0 0 3px rgba(249,115,22,.25)';
    followersBadgeEl.style.marginTop = '2px';

    // show / hide dot
    followersBadgeEl.hidden = !hasNew;
    followersBadgeEl.style.display = hasNew ? 'inline-block' : 'none';

    // optional: let CSS also react if you use data-attrs
    const parent = followersBadgeEl.closest('.pp-count');
    if (parent) {
      if (hasNew) parent.dataset.followersNew = '1';
      else delete parent.dataset.followersNew;
    }
  };

  const markFollowersSeen = () => {
    if (!meUid || !followersCountEl || !followersBadgeEl) return;

    const current = Number(followersCountEl.textContent || '0');
    lsSeenFollowersSet(meUid, vUid, String(current));

    // hard hide – kill everything
    followersBadgeEl.hidden = true;
    followersBadgeEl.style.display = 'none';

    const parent = followersBadgeEl.closest('.pp-count');
    if (parent) delete parent.dataset.followersNew;
  };


  // archive rebuild helper
  const rebuildArchive = (rangeName, which, rootToUse) => {
    const root2 = rootToUse || root;
    const dayStart = (dt) =>
      new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const now = new Date();
    const today0 = dayStart(now);

    const ranges = {
      today: { from: today0, to: new Date(+today0 + 86400000) },
      yesterday: { from: new Date(+today0 - 86400000), to: today0 },
      '7d': {
        from: new Date(+today0 - 6 * 86400000),
        to: new Date(+today0 + 86400000),
      },
      '30d': {
        from: new Date(+today0 - 29 * 86400000),
        to: new Date(+today0 + 86400000),
      },
    };
    const r = ranges[rangeName] || ranges.today;
    const inRange = (ts) => ts >= r.from && ts < r.to;

    const doneRaw = _getAllDone?.() || [];
    const removedRaw = _getAllRemoved?.() || [];

    const panelDone = root2.querySelector('.pp-arch[data-arch="done"]');
    const panelRemoved = root2.querySelector('.pp-arch[data-arch="removed"]');

    const openSetDone = new Set(
      [...(panelDone?.querySelectorAll('.pp-dsec[open]') || [])].map(
        (el) => el.dataset.dateKey,
      ),
    );
    const openSetRemoved = new Set(
      [...(panelRemoved?.querySelectorAll('.pp-dsec[open]') || [])].map(
        (el) => el.dataset.dateKey,
      ),
    );

    const done = doneRaw.filter((t) =>
      inRange(new Date(t.completedAt || t.date || Date.now())),
    );
    const removed = removedRaw.filter((t) =>
      inRange(new Date(t.removedAt || t.date || Date.now())),
    );

    const doneGroups = groupByDateThenTime(done);
    const removedGroups = groupByDateThenTime(removed);

    if (panelDone) {
      panelDone.innerHTML = doneGroups.length
        ? doneGroups.map(([dk, arr]) => dateSection(dk, arr, 'done')).join('')
        : `<div class="pp-emptyli">אין משימות שבוצעו בטווח זה</div>`;
      panelDone.querySelectorAll('.pp-dsec').forEach((sec) => {
        if (openSetDone.has(sec.dataset.dateKey)) sec.setAttribute('open', '');
      });
      panelDone.insertAdjacentHTML(
        'beforeend',
        `<div class="pp-summary" dir="rtl">סה״כ: <b>${done.length}</b></div>`,
      );
    }
    if (panelRemoved) {
      panelRemoved.innerHTML = removedGroups.length
        ? removedGroups
            .map(([dk, arr]) => dateSection(dk, arr, 'removed'))
            .join('')
        : `<div class="pp-emptyli">אין משימות שבוטלו בטווח זה</div>`;
      panelRemoved.querySelectorAll('.pp-dsec').forEach((sec) => {
        if (openSetRemoved.has(sec.dataset.dateKey))
          sec.setAttribute('open', '');
      });
      panelRemoved.insertAdjacentHTML(
        'beforeend',
        `<div class="pp-summary" dir="rtl">סה״כ: <b>${removed.length}</b></div>`,
      );
    }

    if (which === 'done') {
      panelDone?.removeAttribute('hidden');
      panelRemoved?.setAttribute('hidden', 'true');
    } else {
      panelRemoved?.removeAttribute('hidden');
      panelDone?.setAttribute('hidden', 'true');
    }
  };

  // archive tab click
  root.querySelectorAll('.pp-arch-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-toggle');
      root.querySelectorAll('.pp-arch-toggle').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', String(on));
      });
      const currentRange =
        root
          .querySelector('.pp-range.is-active')
          ?.getAttribute('data-range') || 'today';
      rebuildArchive(currentRange, name);
    });
  });

  // range click
  root.querySelectorAll('.pp-range').forEach((chip) => {
    chip.addEventListener('click', () => {
      root
        .querySelectorAll('.pp-range')
        .forEach((c) => c.classList.toggle('is-active', c === chip));
      const range = chip.getAttribute('data-range') || 'today';
      const currentPanel =
        root
          .querySelector('.pp-arch-toggle.is-active')
          ?.getAttribute('data-toggle') || 'done';
      rebuildArchive(range, currentPanel);
    });
  });

  // inline delete/recover + Firestore mirror
  root.addEventListener('click', async (e) => {
    const delBtn = e.target.closest('[data-delperm]');
    const repBtn = e.target.closest('[data-repeat]');
    if (!delBtn && !repBtn) return;

    const currentRange =
      root
        .querySelector('.pp-range.is-active')
        ?.getAttribute('data-range') || 'today';
    const currentPanel =
      root
        .querySelector('.pp-arch-toggle.is-active')
        ?.getAttribute('data-toggle') || 'done';

    if (delBtn) {
      markBusy(delBtn);
      const id = delBtn.getAttribute('data-id');
      const kind = delBtn.getAttribute('data-kind');

      const li = delBtn.closest('.pp-taskli');
      if (li) li.classList.add('pp-taskli--vanish');

      setTimeout(async () => {
        permaDelete?.(id, kind);
        await maybePersistTaskChange('delete', id, kind);

        const meUid2 = auth.currentUser?.uid;
        try {
          await deleteTaskDoc(meUid2, id);
        } catch {}

        markDone(delBtn);
        rebuildArchive(currentRange, currentPanel, root);
      }, 320);
      return;
    }

    if (repBtn) {
      markBusy(repBtn);

      const id = repBtn.getAttribute('data-id');
      const kind = repBtn.getAttribute('data-kind');
      const src = (kind === 'done' ? _getAllDone() : _getAllRemoved()).find(
        (t) => String(t.id) === String(id),
      );
      if (!src) return;
      const now = new Date();
      const evt = {
        date: keyOf(now),
        time:
          src.time || `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
        title: src.title || 'ללא כותרת',
        done: false,
      };
      addEvent?.(evt);
      await maybePersistTaskChange('restore', id, kind);

      const meUid2 = auth.currentUser?.uid;
      try {
        await upsertTaskDoc(
          meUid2,
          { id, title: evt.title, time: evt.time, date: evt.date },
          'active',
        );
      } catch {}

      const li = repBtn.closest('.pp-taskli');
      if (li) {
        li.classList.add('pp-taskli--recovered');
        setTimeout(() => li.classList.remove('pp-taskli--recovered'), 800);
      }

      repBtn.classList.add('pp-btn-flip');
      setTimeout(() => {
        repBtn.textContent = '✓';
        repBtn.setAttribute('aria-label', 'שוחזר ✓');
        repBtn.classList.remove('pp-btn-flip');
      }, 180);

      markDone(repBtn);

      setTimeout(() => {
        if (root.isConnected) rebuildArchive(currentRange, currentPanel, root);
      }, 420);
    }
  });

  /* -----------------------------------------------------------
     Followers / Following DROPDOWN wiring (full-width)
  ----------------------------------------------------------- */
  const panel = root.querySelector('#ppFollowPanel');
  const panelBody = panel?.querySelector('[data-followpanel-body]');
  const panelTitle = panel?.querySelector('#ppFollowPanelTitle');
  const counters = root.querySelector('.pp-counters');

   async function loadFollowList(kind) {
    if (!panel || !panelBody) return;
    const uid = viewedUid();
    if (!uid || !db) return;

    panelBody.innerHTML = `<div class="pp-followpanel__empty">טוען…</div>`;
    if (panelTitle) {
      panelTitle.textContent = kind === 'followers' ? 'עוקבים' : 'נעקבים';
    }

    const relCol =
      kind === 'followers'
        ? collection(db, 'users', uid, 'followers')
        : collection(db, 'users', uid, 'following');

    try {
      const snap = await getDocs(relCol);

      // collect relations with their timestamps
      const rels = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() || {};

        // skip soft-deleted relations
        if (d.__deleted === true) return;

        const otherUid = d.uid || docSnap.id;
        if (!otherUid) return;

        // normalize "at" to millis (can be Date or Firestore Timestamp)
        let atMs = 0;
        const at = d.at;
        if (at instanceof Date) {
          atMs = at.getTime();
        } else if (at && typeof at === 'object') {
          if (typeof at.toMillis === 'function') {
            atMs = at.toMillis();
          } else if (typeof at.seconds === 'number') {
            atMs = at.seconds * 1000;
          }
        }

        rels.push({ uid: otherUid, atMs });
      });

      if (!rels.length) {
        panelBody.innerHTML = `<div class="pp-followpanel__empty">אין נתונים עדיין</div>`;
        return;
      }

      // newest followers first
      rels.sort((a, b) => (b.atMs || 0) - (a.atMs || 0));

      // dedupe while preserving order
      const orderedUids = [];
      const seen = new Set();
      for (const r of rels) {
        if (seen.has(r.uid)) continue;
        seen.add(r.uid);
        orderedUids.push(r.uid);
      }

      const entries = [];
      for (const ouid of orderedUids) {
        try {
          const usnap = await getDoc(doc(db, 'users', ouid));
          if (!usnap.exists()) continue;
          const ud = usnap.data() || {};
          entries.push({
            uid: ouid,
            firstName: ud.firstName || '',
            lastName: ud.lastName || '',
            displayName: ud.displayName || '',
            handle: (ud.profile && ud.profile.handle) || ud.handle || '',
            avatarUrl: ud.avatarUrl || '',
          });
        } catch {
         
        }
      }

      if (!entries.length) {
        panelBody.innerHTML = `<div class="pp-followpanel__empty">אין נתונים עדיין</div>`;
        return;
      }

      panelBody.innerHTML = `
        <ul class="pp-followlist">
          ${entries
            .map((e) => {
              const fullName =
                e.displayName ||
                [e.firstName, e.lastName].filter(Boolean).join(' ') ||
                'משתמש ללא שם';
              const handle = e.handle
                ? `@${String(e.handle).replace(/^@/, '')}`
                : '';
              const initialsSource = e.firstName || e.lastName || '?';
              const initials = [...initialsSource.trim()][0] || '?';

              const avatar = e.avatarUrl
                ? `<img src="${escapeHTML(e.avatarUrl)}" alt="">`
                : `<span class="pp-followchip__fallback">${escapeHTML(
                    initials.toUpperCase(),
                  )}</span>`;

              return `
                <li>
                  <button class="pp-followchip" type="button" data-follow-uid="${escapeHTML(
                    e.uid,
                  )}">
                    <span class="pp-followchip__avatar">${avatar}</span>
                    <span class="pp-followchip__text">
                      <span class="pp-followchip__name">${escapeHTML(
                        fullName,
                      )}</span>
                      ${
                        handle
                          ? `<span class="pp-followchip__handle">${escapeHTML(
                              handle,
                            )}</span>`
                          : ''
                      }
                    </span>
                  </button>
                </li>
              `;
            })
            .join('')}
        </ul>
      `;
    } catch (err) {
      console.warn('[profile] loadFollowList failed', err);
      const msg = /permission|insufficient/i.test(String(err?.message || ''))
        ? 'אין לך הרשאה לראות את הרשימה הזו.'
        : 'שגיאה בטעינה';
      panelBody.innerHTML = `<div class="pp-followpanel__empty">${msg}</div>`;
    }
  }

  function openFollowPanel(kind) {
    if (!panel) return;
    panel.hidden = false;
    panel.classList.add('is-open');

    if (kind === 'followers') {
      // mark them as seen AND immediately refresh the badge UI
      markFollowersSeen();
      refreshFollowerBadge();
    }

    loadFollowList(kind);
  }


  function closeFollowPanel() {
    if (!panel) return;
    panel.classList.remove('is-open');
    panel.hidden = true;
    panel.dataset.currentKind = '';
  }

  // open from counters – toggle / switch smoothly
  root.querySelectorAll('[data-open-follow]').forEach((el) => {
    el.addEventListener('click', () => {
      const kindAttr = el.getAttribute('data-open-follow');
      const kind = kindAttr === 'following' ? 'following' : 'followers';
      const isOpen = panel && !panel.hidden && panel.classList.contains('is-open');
      const currentKind = panel?.dataset.currentKind || '';

      if (!isOpen) {
        // closed → open with requested kind
        openFollowPanel(kind);
      } else if (currentKind !== kind) {
        // open on other kind → switch content, stay open
        openFollowPanel(kind);
      } else {
        // open on same kind → close
        closeFollowPanel();
      }
    });
  });

  // close button
  panel
    ?.querySelector('[data-followpanel-close]')
    ?.addEventListener('click', () => {
      closeFollowPanel();
    });

  // click outside card
  document.addEventListener('click', (e) => {
    if (!panel || panel.hidden || !panel.classList.contains('is-open')) return;
    const card = panel.querySelector('.pp-followpanel__card');
    const target = e.target;
    if (!card.contains(target) && !counters.contains(target)) {
      closeFollowPanel();
    }
  });

  // esc to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel && panel.classList.contains('is-open')) {
      closeFollowPanel();
    }
  });

  // click on chip → jump to that profile
  panelBody?.addEventListener('click', (e) => {
    const chip = e.target.closest('.pp-followchip');
    if (!chip) return;
    const uid = chip.getAttribute('data-follow-uid');
    if (!uid) return;
    closeFollowPanel();
    mount({ uid });
  });

  // decorate gamified task counter
  // decorate gamified COMPLETED-tasks badge in the stats card
  const doneBadge = root.querySelector('.pp-stat--doneLevel');
  if (doneBadge) {
    const doneTotal = Number(doneBadge.getAttribute('data-task-done') || '0');
    const lvlIdx = Number(doneBadge.getAttribute('data-task-level') || '0');
    const levelUpFlag = doneBadge.hasAttribute('data-level-up');
    decorateTaskBadge(doneBadge, doneTotal, lvlIdx, levelUpFlag);
  }

    // followers "new" dot – run once on mount
  if (followersBadgeEl && followersCountEl && meUid) {
    refreshFollowerBadge();
  }
  // decorate “all tasks” badge in the stats card with the same game style
  const allTasksEl = root.querySelector('.pp-stat--alltasks');
  if (allTasksEl) {
    const total2 = Number(allTasksEl.getAttribute('data-task-total') || '0');
    const lvlIdx2 = computeTaskLevel(total2);
    decorateTaskBadge(allTasksEl, total2, lvlIdx2, false);
  }

}

/* -------------------------------------------------------------
   12. info bar under chart
------------------------------------------------------------- */
function showBarInfo(hit, root) {
  const date = hit.dataset.date;
  const done = Number(hit.dataset.done || '0');
  const removed = Number(hit.dataset.removed || '0');
  const info = root.querySelector('#ppBarInfo');
  if (!info) return;
  info.innerHTML = `
    <div class="pp-barinfo-line pp-barinfo-line--ltr">
      <span class="pp-barinfo-date">${date}</span>
      <span class="pp-barinfo-chip pp-barinfo-chip--done">בוצעו: ${done}</span>
      <span class="pp-barinfo-chip pp-barinfo-chip--removed">בוטלו: ${removed}</span>
      <span class="pp-barinfo-mark"></span>
    </div>
  `;
  info.style.display = 'block';
}

/* -------------------------------------------------------------
   13. optional audit
------------------------------------------------------------- */
async function maybePersistTaskChange(action, id, kind) {
  const uid = auth.currentUser?.uid;
  if (!uid || !db) return;
  try {
    const col = collection(db, 'users', uid, 'taskAudit');
    await addDoc(col, {
      action,
      taskId: id,
      sourceList: kind,
      at: new Date(),
    });
  } catch (err) {
    console.warn('[profile] task audit write failed', err);
  }
}


