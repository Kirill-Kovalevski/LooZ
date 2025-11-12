// /src/pages/profile.js
// LooZ profile page with:
// - stacked 7-day bars (done vs removed) + LTR info pill
// - archive tabs + range chips that stay open
// - animated delete / animated recover
// - social activity: FULL-WIDTH DROPDOWNS (likes / comments)
// - Firestore follow + task audit
// - cover/avatar clickable (no camera icons)

import { auth, authReady, db } from '../core/firebase.js';
import { doc, getDoc, updateDoc, setDoc, collection, addDoc } from 'firebase/firestore';

import { getUser } from '../services/auth.service.js';
import { uploadUserImage, assertImageAcceptable } from '../services/storage.service.js';
import { saveUserProfile } from '../services/firestore.service.js';
import { escapeHTML, bust, cssUrlSafe } from '../utils/sanitize.js';
import profileLogo from '../icons/profile-logo.png';
import {
  _getAllActive, _getAllDone, _getAllRemoved,
  permaDelete, addEvent
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
  IS_FOLLOW:   'profile.is_followed',
  THEME:       'profile.theme',
  DEF_VIEW:    'profile.defaultView',
};

const LS_PREFIX = 'looz';
const curUid = () => auth.currentUser?.uid || (getUser?.() && getUser().uid) || 'guest';
const keyScoped = (k) => `${LS_PREFIX}:${curUid()}:${k}`;
const lsGet = (k) => localStorage.getItem(keyScoped(k));
const lsSet = (k, v) => localStorage.setItem(keyScoped(k), v ?? '');

const pad2 = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

/* -------------------------------------------------------------
   1. Firestore → LS
------------------------------------------------------------- */
async function hydrateProfileFromFirestore() {
  const uid = curUid();
  if (!uid || uid === 'guest') return;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return;
    const d = snap.data() || {};

    if (d.avatarUrl)  lsSet(K.AVATAR, d.avatarUrl);
    if (d.avatarPath) lsSet(K.AVATAR_PATH, d.avatarPath);
    if (d.coverUrl)   lsSet(K.COVER, d.coverUrl);
    if (d.coverPath)  lsSet(K.COVER_PATH, d.coverPath);

    if (d.displayName) lsSet(K.DISPLAY, d.displayName);
    if (d.firstName)   lsSet(K.NAME, d.firstName);
    if (d.lastName)    lsSet(K.SUR, d.lastName);
    if (d.profile?.handle) lsSet(K.HANDLE, d.profile.handle);

    if (Number.isFinite(d.followers)) lsSet(K.FOLLOWERS, String(d.followers));
    if (Number.isFinite(d.following)) lsSet(K.FOLLOWING, String(d.following));

    if (d.theme)       lsSet(K.THEME, d.theme);
    if (d.defaultView) lsSet(K.DEF_VIEW, d.defaultView);
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
  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9));
  return blob || file;
}
function fileToDataURL(file){
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
function getStats(){
  const active  = _getAllActive?.() || [];
  const done    = _getAllDone?.() || [];
  const removed = _getAllRemoved?.() || [];
  const total   = active.length + done.length + removed.length;

  const today = new Date();
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return { date: d, done: 0, removed: 0 };
  });

  const pour = (arr, kind) => {
    for (const it of arr) {
      const t = new Date(it.completedAt || it.removedAt || it.date || Date.now());
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
  const COLORS = { done: '#7060ff', removed: '#e46d5c' };
  const W = 320, H = 160, PAD_X = 16, PAD_TOP = 32, PAD_BOTTOM = 44;
  const barAreaW = W - PAD_X*2;
  const buckets = stats.buckets;
  const maxVal = Math.max(1, ...buckets.map(b => b.done + b.removed));
  const barW = 28;
  const gap = buckets.length > 1
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
    const mm = pad2(b.date.getMonth()+1);

    bars += `
      <g class="pp-bar" transform="translate(${x},0)">
        <rect x="0" y="${PAD_TOP}" width="${barW}" height="${H - PAD_TOP - PAD_BOTTOM}" rx="14" fill="rgba(126,146,186,0.03)"></rect>
        <rect x="1.5" y="${yRemoved}" width="${barW - 3}" height="${hRemoved || 6}" rx="10"
          style="fill:${COLORS.removed};filter:drop-shadow(0 6px 10px rgba(228,109,92,0.28));"></rect>
        <rect x="1.5" y="${yDone}" width="${barW - 3}" height="${hDone || 6}" rx="10"
          style="fill:${COLORS.done};filter:drop-shadow(0 6px 10px rgba(112,96,255,0.3));"></rect>
        <rect x="0" y="${PAD_TOP}" width="${barW}" height="${H - PAD_TOP - PAD_BOTTOM}"
          fill="transparent" class="pp-barhit"
          data-date="${dd}.${mm}" data-done="${b.done}" data-removed="${b.removed}"></rect>
        <text x="${barW/2}" y="${H - 16}" text-anchor="middle" class="pp-xlbl">${dd}.${mm}</text>
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
        <line x1="${PAD_X}" y1="${H - PAD_BOTTOM}" x2="${W - PAD_X}" y2="${H - PAD_BOTTOM}" class="pp-grid"></line>
        ${bars}
      </svg>
      <div class="pp-legendrow" dir="rtl">
        <span class="pp-legitem"><i class="pp-dot pp-dot--done" style="background:#7060ff"></i>בוצעו</span>
        <span class="pp-legitem"><i class="pp-dot pp-dot--removed" style="background:#e46d5c"></i>בוטלו</span>
      </div>
      <div class="pp-barinfo" id="ppBarInfo" aria-live="polite"></div>
    </div>
  `;
}

function sparklessCounters(stats){
  return `
    <section class="pp-card pp-stats" aria-label="סטטיסטיקה">
      <div class="pp-statrow">
        <div class="pp-stat"><span class="pp-num">${stats.total}</span><span class="pp-lbl">סה״כ</span></div>
        <div class="pp-stat"><span class="pp-num">${stats.done}</span><span class="pp-lbl">בוצעו</span></div>
        <div class="pp-stat"><span class="pp-num">${stats.del}</span><span class="pp-lbl">בוטלו</span></div>
      </div>
      <div id="ppGraphSlot"></div>
    </section>
  `;
}

/* -------------------------------------------------------------
   5. archives
------------------------------------------------------------- */
function liRow(t, kind){
  const time  = escapeHTML((t.time || '00:00').trim());
  const title = escapeHTML((t.title || 'ללא כותרת').trim());
  const dim   = (kind === 'done') ? ' is-archived' : '';
  return `
    <li class="pp-taskli${dim}" dir="rtl">
      <span class="pp-time" dir="ltr">${time}</span>
      <span class="pp-title">${title}</span>
      <span class="pp-actions" dir="ltr">
        <button class="pp-repeat"  title="חזור על המשימה" data-repeat data-id="${String(t.id)}" data-kind="${kind}" aria-label="חזור">↻</button>
        <button class="pp-delperm" title="מחק לצמיתות"    data-delperm data-id="${String(t.id)}" data-kind="${kind}" aria-label="מחק">🗑</button>
      </span>
    </li>
  `;
}
function groupByDateThenTime(list){
  const map = new Map();
  for (const t of list){
    const d = new Date(t.completedAt || t.removedAt || t.date || Date.now());
    const k = keyOf(d);
    (map.get(k) || map.set(k, []).get(k)).push(t);
  }
  for (const [, arr] of map) arr.sort((a,b)=>(a.time||'00:00').localeCompare(b.time||'00:00'));
  return [...map.entries()].sort((a,b)=> b[0].localeCompare(a[0]));
}
function dateSection(dateKey, arr, kind){
  const [y,m,d] = dateKey.split('-');
  const nice = `${d}.${m}`;
  return `
    <details class="pp-dsec" open dir="rtl" data-date-key="${dateKey}">
      <summary class="pp-dsum">
        <span class="pp-dlabel" dir="ltr">${escapeHTML(nice)}</span>
        <span class="pp-dcount">(${arr.length})</span>
      </summary>
      <ul class="pp-list">
        ${arr.map(t => liRow(t, kind)).join('')}
      </ul>
    </details>
  `;
}
function archivesHTML(range = 'today'){
  const doneRaw    = _getAllDone?.()    || [];
  const removedRaw = _getAllRemoved?.() || [];

  const dayStart = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const now = new Date(), today0 = dayStart(now);
  const ranges = {
    today:     { from: today0,           to: new Date(+today0 + 86400000) },
    yesterday: { from: new Date(+today0 - 86400000), to: today0 },
    '7d':      { from: new Date(+today0 - 6*86400000), to: new Date(+today0 + 86400000) },
    '30d':     { from: new Date(+today0 - 29*86400000), to: new Date(+today0 + 86400000) },
  };
  const r = ranges[range] || ranges.today;
  const inRange = (ts) => ts >= r.from && ts < r.to;

  const done    = doneRaw.filter(t => inRange(new Date(t.completedAt || t.date || Date.now())));
  const removed = removedRaw.filter(t => inRange(new Date(t.removedAt   || t.date || Date.now())));

  const doneGroups    = groupByDateThenTime(done);
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
        ${doneGroups.length
          ? doneGroups.map(([dk, arr]) => dateSection(dk, arr, 'done')).join('')
          : `<div class="pp-emptyli">אין משימות שבוצעו בטווח זה</div>`}
        <div class="pp-summary" dir="rtl">סה״כ: <b>${done.length}</b></div>
      </div>

      <div class="pp-arch" data-arch="removed" hidden>
        ${removedGroups.length
          ? removedGroups.map(([dk, arr]) => dateSection(dk, arr, 'removed')).join('')
          : `<div class="pp-emptyli">אין משימות שבוטלו בטווח זה</div>`}
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
function socialActivityHTML(){
  const isLoggedIn = !!(auth.currentUser || getUser?.());
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
          ${e.text ? `<div class="pp-soc-note">${escapeHTML(e.text.slice(0, 80))}</div>` : ''}
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
          ${likeCount ? likes.map(makeRow).join('') : `<li class="pp-actempty">אין אהודות עדיין</li>`}
        </ul>
      </details>

      <details class="pp-acc" data-acc="comments">
        <summary class="pp-acc-btn" dir="rtl">
          <span>הגבתי</span>
          <span class="pp-acc-count">${commentCount}</span>
        </summary>
        <ul class="pp-soc-list">
          ${commentCount ? comments.map(makeRow).join('') : `<li class="pp-actempty">אין תגובות עדיין</li>`}
        </ul>
      </details>

      <p class="pp-soc-foot">לחיצה על פריט תעביר למסך החברתי.</p>
    </section>
  `;
}

/* -------------------------------------------------------------
   7. name + handle
------------------------------------------------------------- */
function getBestDisplayName() {
  const display = lsGet(K.DISPLAY);
  const fScoped = lsGet(K.NAME);
  const lScoped = lsGet(K.SUR);
  if (display) return escapeHTML(display);
  if (fScoped || lScoped) return escapeHTML([fScoped, lScoped].filter(Boolean).join(' '));

  const fOld = localStorage.getItem('firstName') || localStorage.getItem('profile.firstName') || '';
  const lOld = localStorage.getItem('lastName')  || localStorage.getItem('profile.lastName')  || '';
  if (fOld || lOld) return escapeHTML(`${fOld} ${lOld}`.trim());

  const u = auth.currentUser;
  if (u?.displayName) return escapeHTML(u.displayName);
  if (u?.email) return escapeHTML(u.email);

  return 'אורח';
}
function getHandleHTML() {
  const raw =
    lsGet(K.HANDLE) ||
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
function renderProfile(){
  const cover   = lsGet(K.COVER)  || '';
  const avatar  = lsGet(K.AVATAR) || '';
  const isOn    = (lsGet(K.IS_FOLLOW) || '0') === '1';
  const stats   = getStats();

  const coverStyle = cover
    ? `--cover:url(${cssUrlSafe(bust(cover))});background-image:var(--cover)`
    : '';

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
          <button class="pp-btn pp-btn--follow ${isOn ? 'is-on' : ''}" data-act="follow">${isOn ? 'עוקב ✓' : 'עקוב'}</button>
        </div>

        <div class="pp-counters" role="group" aria-label="מונה">
          <div class="pp-count"><b id="ppFollowers">${Number(lsGet(K.FOLLOWERS) || '0')}</b><span>עוקבים</span></div>
          <div class="pp-count"><b id="ppFollowing">${Number(lsGet(K.FOLLOWING) || '0')}</b><span>נעקבים</span></div>
          <div class="pp-count"><b>${stats.total}</b><span>משימות</span></div>
        </div>
      </section>

      ${sparklessCounters(stats)}
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
  const url = lsGet(K.COVER) || '';
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
export async function mount(root){
  await authReady;
  await hydrateProfileFromFirestore();

  const target = root || document.getElementById('app') || document.body;
  target.innerHTML = renderProfile();

  paintCoverFromLS(target);

  wire(target);
}
export default { mount };

// ---- action button feedback helpers ----
function markBusy(btn) { btn?.classList.add('is-busy'); }
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
   11. wire
------------------------------------------------------------- */
// NEW: session guard to avoid double-restore spam
const restoredIds = new Set();

function wire(root){
  document.body.setAttribute('data-view', 'profile');

  document.querySelectorAll('.c-bottom-cta, .c-cta, .btn-create-orb')
    .forEach(el => el.style.display = 'none');

  $('[data-act="back"]', root)?.addEventListener('click', () => history.back());
  $('[data-act="home"]', root)?.addEventListener('click', async () => {
    const { mount } = await import('./home.js');
    mount(document.getElementById('app'));
  });

  // click cover anywhere
  root.querySelector('.pp-cover')?.addEventListener('click', () => {
    $('#ppCoverInput', root)?.click();
  });

  // click avatar anywhere
  root.querySelector('.pp-avatar')?.addEventListener('click', (ev) => {
    ev.stopPropagation();
    $('#ppAvatarInput', root)?.click();
  });

  // cover upload
  $('#ppCoverInput', root)?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      assertImageAcceptable(file, 'cover');
      const user = auth.currentUser;
      const downscaled = await downscaleImage(file, 1600);

      if (user) {
        const prev = lsGet(K.COVER_PATH) || undefined;
        const { url, path } = await uploadUserImage(user.uid, 'cover', downscaled, prev);
        lsSet(K.COVER, url);
        lsSet(K.COVER_PATH, path);
        await saveUserProfile?.(user.uid, { coverUrl: url, coverPath: path });
        paintCoverFromLS(root);
      } else {
        const dataUrl = await fileToDataURL(downscaled);
        lsSet(K.COVER, dataUrl);
        paintCoverFromLS(root);
      }
    } catch (err) {
      console.error('cover upload failed:', err);
    } finally {
      e.target.value = '';
    }
  });

  // avatar upload
  $('#ppAvatarInput', root)?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      assertImageAcceptable(file, 'avatar');
      const user = auth.currentUser;
      const downscaled = await downscaleImage(file, 800);

      if (user) {
        const prev = lsGet(K.AVATAR_PATH) || undefined;
        const { url, path } = await uploadUserImage(user.uid, 'avatar', downscaled, prev);
        lsSet(K.AVATAR, url);
        lsSet(K.AVATAR_PATH, path);
        await saveUserProfile?.(user.uid, { avatarUrl: url, avatarPath: path });
        root.querySelector('.pp-avatar__img')?.setAttribute('src', bust(url));
      } else {
        const dataUrl = await fileToDataURL(downscaled);
        lsSet(K.AVATAR, dataUrl);
        root.querySelector('.pp-avatar__img')?.setAttribute('src', bust(dataUrl));
      }
    } catch (err) {
      console.error('avatar upload failed:', err);
    } finally {
      e.target.value = '';
    }
  });

  // chart slot
  const slot  = root.querySelector('#ppGraphSlot');
  if (slot) {
    const stats = getStats();
    slot.innerHTML = graphHTML(stats);
  }

  // bar click
  root.addEventListener('click', (e) => {
    const hit = e.target.closest('.pp-barhit');
    if (!hit) return;
    showBarInfo(hit, root);
  });
  root.addEventListener('touchstart', (e) => {
    const hit = e.target.closest('.pp-barhit');
    if (!hit) return;
    showBarInfo(hit, root);
  }, { passive: true });

  // (NEW) social rows → social page
  root.querySelectorAll('.pp-soc-card[data-post-id]').forEach(li => {
    li.addEventListener('click', async () => {
      const pid = li.getAttribute('data-post-id');
      if (!pid) return;
      localStorage.setItem('social.focusPostId', pid);
      const { mount } = await import('./social.js');
      const app = document.getElementById('app') || document.body;
      mount(app);
    });
  });

  // follow
  const $followBtn = root.querySelector('[data-act="follow"]');
  const $followers = root.querySelector('#ppFollowers');
  if ($followBtn && $followers) {
    const paintFollow = () => {
      const on = (lsGet(K.IS_FOLLOW) || '0') === '1';
      $followBtn.classList.toggle('is-on', on);
      $followBtn.textContent = on ? 'עוקב ✓' : 'עקוב';
    };
    paintFollow();

    $followBtn.addEventListener('click', async () => {
      const was = (lsGet(K.IS_FOLLOW) || '0') === '1';
      lsSet(K.IS_FOLLOW, was ? '0' : '1');

      const cur  = Number(lsGet(K.FOLLOWERS) || '0');
      const next = was ? Math.max(0, cur - 1) : cur + 1;
      lsSet(K.FOLLOWERS, String(next));
      $followers.textContent = String(next);
      paintFollow();

      const uid = auth.currentUser?.uid;
      if (uid) {
        const ref = doc(db, 'users', uid);
        try {
          await updateDoc(ref, { followers: next });
        } catch {
          try {
            await setDoc(ref, { followers: next }, { merge: true });
          } catch (e2) {
            console.warn('[profile] failed to persist followers', e2);
          }
        }
      }
    });
  }

  // archive rebuild helper
  const rebuildArchive = (rangeName, which, rootToUse) => {
    const root2 = rootToUse || root;
    const dayStart = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const now = new Date();
    const today0 = dayStart(now);

    const ranges = {
      today:     { from: today0,                     to: new Date(+today0 + 86400000) },
      yesterday: { from: new Date(+today0 - 86400000), to: today0 },
      '7d':      { from: new Date(+today0 - 6*86400000), to: new Date(+today0 + 86400000) },
      '30d':     { from: new Date(+today0 - 29*86400000), to: new Date(+today0 + 86400000) },
    };
    const r = ranges[rangeName] || ranges.today;
    const inRange = (ts) => ts >= r.from && ts < r.to;

    const doneRaw    = _getAllDone?.()    || [];
    const removedRaw = _getAllRemoved?.() || [];

    const panelDone    = root2.querySelector('.pp-arch[data-arch="done"]');
    const panelRemoved = root2.querySelector('.pp-arch[data-arch="removed"]');

    const openSetDone = new Set([...panelDone?.querySelectorAll('.pp-dsec[open]') || []].map(el => el.dataset.dateKey));
    const openSetRemoved = new Set([...panelRemoved?.querySelectorAll('.pp-dsec[open]') || []].map(el => el.dataset.dateKey));

    const done    = doneRaw.filter(t => inRange(new Date(t.completedAt || t.date || Date.now())));
    const removed = removedRaw.filter(t => inRange(new Date(t.removedAt   || t.date || Date.now())));

    const doneGroups    = groupByDateThenTime(done);
    const removedGroups = groupByDateThenTime(removed);

    if (panelDone) {
      panelDone.innerHTML = doneGroups.length
        ? doneGroups.map(([dk, arr]) => dateSection(dk, arr, 'done')).join('')
        : `<div class="pp-emptyli">אין משימות שבוצעו בטווח זה</div>`;
      panelDone.querySelectorAll('.pp-dsec').forEach(sec => {
        if (openSetDone.has(sec.dataset.dateKey)) sec.setAttribute('open', '');
      });
      panelDone.insertAdjacentHTML('beforeend', `<div class="pp-summary" dir="rtl">סה״כ: <b>${done.length}</b></div>`);
    }
    if (panelRemoved) {
      panelRemoved.innerHTML = removedGroups.length
        ? removedGroups.map(([dk, arr]) => dateSection(dk, arr, 'removed')).join('')
        : `<div class="pp-emptyli">אין משימות שבוטלו בטווח זה</div>`;
      panelRemoved.querySelectorAll('.pp-dsec').forEach(sec => {
        if (openSetRemoved.has(sec.dataset.dateKey)) sec.setAttribute('open', '');
      });
      panelRemoved.insertAdjacentHTML('beforeend', `<div class="pp-summary" dir="rtl">סה״כ: <b>${removed.length}</b></div>`);
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
  root.querySelectorAll('.pp-arch-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-toggle');
      root.querySelectorAll('.pp-arch-toggle').forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', String(on));
      });
      const currentRange = root.querySelector('.pp-range.is-active')?.getAttribute('data-range') || 'today';
      rebuildArchive(currentRange, name);
    });
  });

  // range click
  root.querySelectorAll('.pp-range').forEach(chip => {
    chip.addEventListener('click', () => {
      root.querySelectorAll('.pp-range').forEach(c => c.classList.toggle('is-active', c === chip));
      const range = chip.getAttribute('data-range') || 'today';
      const currentPanel = root.querySelector('.pp-arch-toggle.is-active')?.getAttribute('data-toggle') || 'done';
      rebuildArchive(range, currentPanel);
    });
  });

  // inline delete/recover with animation (+ button micro-feedback)
  root.addEventListener('click', async (e)=> {
    const delBtn = e.target.closest('[data-delperm]');
    const repBtn = e.target.closest('[data-repeat]');
    if (!delBtn && !repBtn) return;

    const currentRange = root.querySelector('.pp-range.is-active')?.getAttribute('data-range') || 'today';
    const currentPanel = root.querySelector('.pp-arch-toggle.is-active')?.getAttribute('data-toggle') || 'done';

    if (delBtn) {
      markBusy(delBtn);
      const id   = delBtn.getAttribute('data-id');
      const kind = delBtn.getAttribute('data-kind');

      const li = delBtn.closest('.pp-taskli');
      if (li) li.classList.add('pp-taskli--vanish');

      setTimeout(async () => {
        permaDelete?.(id, kind);
        await maybePersistTaskChange('delete', id, kind);
        markDone(delBtn);
        rebuildArchive(currentRange, currentPanel, root);
      }, 320);
      return;
    }

    if (repBtn) {
      const id   = repBtn.getAttribute('data-id');
      const kind = repBtn.getAttribute('data-kind');

      // GUARDS: prevent duplicates & spam
      if (repBtn.disabled || repBtn.dataset.locked === '1' || restoredIds.has(id)) return;
      repBtn.disabled = true;
      repBtn.dataset.locked = '1';
      restoredIds.add(id);

      markBusy(repBtn);

      const src = (kind==='done' ? _getAllDone() : _getAllRemoved()).find(t => String(t.id) === String(id));
      const now = new Date();

      // 1) add a fresh active event
      if (src) {
        addEvent?.({
          date: keyOf(now),
          time: src.time || `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
          title: src.title || 'ללא כותרת',
          done: false
        });
      } else {
        addEvent?.({
          date: keyOf(now),
          time: `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
          title: 'ללא כותרת',
          done: false
        });
      }

      // 2) remove the archived copy so it DISAPPEARS from the list
      //    (this is the critical missing piece)
      permaDelete?.(id, kind);

      // 3) persist audit
      await maybePersistTaskChange('restore', id, kind);

      // 4) animate: flip → ✓, then vanish the row
      const li = repBtn.closest('.pp-taskli');
      repBtn.classList.add('pp-btn-flip');
      setTimeout(() => {
        if (!repBtn.isConnected) return;
        repBtn.textContent = '✓';
        repBtn.setAttribute('aria-label', 'שוחזר ✓');
        repBtn.classList.remove('pp-btn-flip');
      }, 180);
      markDone(repBtn);

      if (li) {
        // vanish quickly so user sees it's gone
        li.classList.add('pp-taskli--vanish');
      }

      // 5) rebuild the visible archive panel to reflect counts/sections
      setTimeout(() => {
        if (root.isConnected) rebuildArchive(currentRange, currentPanel, root);
      }, 360);
    }
  });

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
