// /src/pages/profile.js
// Profile page with safe output + validated uploads + auth-aware rendering.

import { auth, authReady, db } from '../core/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

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

/* ---------- per-user localStorage helpers ---------- */
const LS_PREFIX = 'looz';
const curUid = () => auth.currentUser?.uid || (getUser?.() && getUser().uid) || 'guest';
const keyScoped = (k) => `${LS_PREFIX}:${curUid()}:${k}`;
const lsGet = (k) => localStorage.getItem(keyScoped(k));
const lsSet = (k, v) => localStorage.setItem(keyScoped(k), v ?? '');
const lsDel = (k) => localStorage.removeItem(keyScoped(k));

/**
 * Load the user's profile doc from Firestore and mirror to per-user LS.
 * Ensures correct avatar/cover after refresh or account switch.
 */
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

    // names
    if (d.displayName) lsSet(K.DISPLAY, d.displayName);
    if (d.firstName)   lsSet(K.NAME, d.firstName);
    if (d.lastName)    lsSet(K.SUR, d.lastName);
    if (d.profile?.handle) lsSet(K.HANDLE, d.profile.handle);

    // social counters
    if (Number.isFinite(d.followers)) lsSet(K.FOLLOWERS, String(d.followers));
    if (Number.isFinite(d.following)) lsSet(K.FOLLOWING, String(d.following));

    // prefs
    if (d.theme)       lsSet(K.THEME, d.theme);
    if (d.defaultView) lsSet(K.DEF_VIEW, d.defaultView);
  } catch (e) {
    console.warn('[profile] hydrateProfileFromFirestore failed', e);
  }
}

const EVENTS_CHANGED = 'events-changed';
const STATS_CHANGED  = 'stats-changed';

const pad2 = n => String(n).padStart(2,'0');
const keyOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

/* ---------- image helpers ---------- */
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

/* ===================== 7-day stats ===================== */
function getStats(){
  const active  = _getAllActive?.() || [];
  const done    = _getAllDone?.() || [];
  const removed = _getAllRemoved?.() || [];
  const total   = active.length + done.length + removed.length;

  const now = new Date();
  const mkBuckets = () => Array.from({length:7}, () => ({ n:0 }));
  const bucketsDone = mkBuckets();
  const bucketsRem  = mkBuckets();

  const bump = (arr, ts) => {
    const d = new Date(ts);
    const diff = Math.floor((now - d) / 86400000);
    if (diff >= 0 && diff < 7) arr[6 - diff].n++;
  };
  for (const it of done)    bump(bucketsDone, it.completedAt || it.date || Date.now());
  for (const it of removed) bump(bucketsRem,  it.removedAt   || it.date || Date.now());

  return { total, done: done.length, del: removed.length, bucketsDone, bucketsRem };
}

/* ===================== Graph helpers ===================== */
function pathLine(series, w=296, h=120, pad=18){
  const max  = Math.max(1, ...series.map(s => s.n));
  const step = (w - pad*2) / (series.length - 1);
  const y    = n => h - pad - (n / max) * (h - pad*2);
  return series.map((s,i) => `${i ? 'L' : 'M'} ${pad + i*step},${y(s.n)}`).join(' ');
}
function pathArea(series, w=296, h=120, pad=18){
  const max  = Math.max(1, ...series.map(s => s.n));
  const step = (w - pad*2) / (series.length - 1);
  const y    = n => h - pad - (n / max) * (h - pad*2);
  let d = '';
  series.forEach((s,i) => { d += `${i ? 'L' : 'M'} ${pad + i*step},${y(s.n)} `; });
  d += `L ${pad + (series.length-1)*step},${h - pad} L ${pad},${h - pad} Z`;
  return d;
}
function dots(series, w=296, h=120, pad=18){
  const max  = Math.max(1, ...series.map(s => s.n));
  const step = (w - pad*2) / (series.length - 1);
  const y    = n => h - pad - (n / max) * (h - pad*2);
  return series.map((s,i)=>({ x: pad + i*step, y: y(s.n), n: s.n, isLast: i===series.length-1 }));
}
function grid(seriesLen, w=296, h=120, pad=18){
  const step = (w - pad*2) / (seriesLen - 1);
  return Array.from({length:seriesLen}, (_,i)=> pad + i*step);
}

function graphHTML(stats, mode = 'done') {
  const W = 296, H = 120, P = 18;
  const series = mode === 'done' ? stats.bucketsDone : stats.bucketsRem;
  const gxs    = grid(series.length, W, H, P);
  const ds     = dots(series, W, H, P);
  const title  = mode === 'done' ? 'בוצעו' : 'בוטלו';

  return `
    <div class="pp-graph" data-mode="${mode}" dir="rtl">
      <svg class="pp-svg" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" aria-label="גרף 7 ימים">
        <defs>
          <linearGradient id="ppArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stop-color="currentColor" stop-opacity=".25"/>
            <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
          </linearGradient>
        </defs>

        ${gxs.map(x => `<line x1="${x}" y1="${P}" x2="${x}" y2="${H-P}" class="pp-grid"></line>`).join('')}
        <line x1="${P}" y1="${H-P}" x2="${W-P}" y2="${H-P}" class="pp-grid"></line>

        <g class="pp-series">
          <g class="pp-area-wrap" style="color:var(--pp-active)">
            <path d="${pathArea(series, W, H, P)}" fill="url(#ppArea)"></path>
          </g>
          <path d="${pathLine(series, W, H, P)}" class="pp-line" style="color:var(--pp-active)"></path>

          ${ds.map(d => `
            <circle cx="${d.x}" cy="${d.y}" r="4" class="pp-dot"></circle>
            ${d.isLast ? `
              <g transform="translate(${d.x + 6}, ${d.y - 16})" class="pp-badge">
                <rect rx="6" ry="6" width="28" height="16"></rect>
                <text x="14" y="12" text-anchor="middle">${d.n}</text>
              </g>
            ` : ''}
          `).join('')}
        </g>
      </svg>

      <div class="pp-legend" dir="rtl">
        <span class="pp-leg"><i class="pp-swatch"></i>${title}</span>
        <span class="pp-sub">בשבעת הימים האחרונים</span>
      </div>

      <div class="pp-ticks" dir="rtl">
        ${Array.from({ length: 7 }, (_, i) =>
          i === 6 ? '<span class="pp-tick">היום</span>' : '<span class="pp-tick"></span>'
        ).join('')}
      </div>
    </div>
  `;
}

/* ===================== Archive + header ===================== */
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
    <details class="pp-dsec" dir="rtl">
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

/* ========= Social activity lists (likes/comments) ========= */
function socialActivityHTML(){
  const posts = JSON.parse(localStorage.getItem('social.posts') || '[]');
  const map   = new Map(posts.map(p => [p.id, p]));

  const { likes, comments } = getSocialActivity();

  const row = (entry, isComment=false) => {
    const p = map.get(entry.postId);
    const title = escapeHTML(p?.title || p?.text || 'ללא כותרת');
    const time  = escapeHTML(entry.time || '00:00');
    const date  = escapeHTML(entry.dateKey || '');
    const extra = isComment ? `<span class="pp-note">“${escapeHTML((entry.text||'').slice(0,60))}”</span>` : '';
    return `<li class="pp-actli"><span class="pp-time" dir="ltr">${time}</span><span class="pp-title">${title}</span>${extra}<span class="pp-date" dir="ltr">${date}</span></li>`;
  };

  return `
    <section class="pp-card" aria-label="פעילות חברתית">
      <header class="pp-arch-head"><h3 class="pp-h3">פעילות חברתית</h3></header>
      <div class="pp-two">
        <div class="pp-col">
          <div class="pp-coltitle">אהבתי</div>
          <ul class="pp-list pp-acts">${likes.map(e => row(e,false)).join('') || '<li class="pp-emptyli">אין אהודות עדיין</li>'}</ul>
        </div>
        <div class="pp-col">
          <div class="pp-coltitle">הגבתי</div>
          <ul class="pp-list pp-acts">${comments.map(e => row(e,true)).join('') || '<li class="pp-emptyli">אין תגובות עדיין</li>'}</ul>
        </div>
      </div>
    </section>
  `;
}

/* ===================== Page header ===================== */
function renderProfile(mode='done'){
  const cover   = lsGet(K.COVER)  || '';
  const avatar  = lsGet(K.AVATAR) || '';
  const isOn    = (lsGet(K.IS_FOLLOW) || '0') === '1';

  const display = lsGet(K.DISPLAY);
  const f = escapeHTML(lsGet(K.NAME) || 'אורח');
  const l = escapeHTML(lsGet(K.SUR)  || '');
  const handle = () => escapeHTML(lsGet(K.HANDLE) || '@looz_user');
  const fullName = () => display
    ? escapeHTML(display)
    : [f,l].filter(Boolean).join(' ');

  const stats = getStats();
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
        <button class="pp-editbtn pp-editbtn--cover" type="button" data-edit="cover" aria-label="החלפת תמונת רקע">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l1 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1-2Zm3 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-2.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" fill="currentColor"/></svg>
        </button>
      </section>

      <section class="pp-card pp-head">
        <div class="pp-avatar">
          <img class="pp-avatar__img" src="${bust(avatar || '')}" alt="">
          <input id="ppAvatarInput" type="file" accept="image/*" hidden>
          <button class="pp-editbtn pp-editbtn--avatar" type="button" data-edit="avatar" aria-label="החלפת תמונת פרופיל">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l1 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1-2Zm3 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-2.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" fill="currentColor"/></svg>
          </button>
        </div>

        <div class="pp-id">
          <div class="pp-name">${fullName()}</div>
          <div class="pp-handle">${handle()}</div>
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

/* ===== Cover repaint helper (from LS; used on mount + after uploads) ===== */
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

/* ===================== wiring ===================== */
export async function mount(root){
  // Wait for the initial Firebase user (fixes “guest” flash on refresh)
  await authReady;

  // Pull the latest profile for that user into per-user LocalStorage
  await hydrateProfileFromFirestore();

  const target = root || document.getElementById('app') || document.body;
  target.innerHTML = renderProfile('done');

  // Ensure the cover is painted immediately from LS
  paintCoverFromLS(target);

  wire(target, 'done');
}
export default { mount };

function wire(root, mode = 'done'){
  document.body.setAttribute('data-view', 'profile');

  document.querySelectorAll('.c-bottom-cta, .c-cta, .btn-create-orb')
    .forEach(el => el.style.display = 'none');

  $('[data-act="back"]', root)?.addEventListener('click', () => history.back());
  $('[data-act="home"]', root)?.addEventListener('click', async () => {
    const { mount } = await import('./home.js');
    mount(document.getElementById('app'));
  });

  root.querySelector('[data-edit="cover"]')?.addEventListener('click', () =>
    $('#ppCoverInput', root)?.click()
  );
  root.querySelector('[data-edit="avatar"]')?.addEventListener('click', () =>
    $('#ppAvatarInput', root)?.click()
  );

  // ===================== COVER upload =====================
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
      alert('שגיאה בהעלאת תמונת רקע');
    } finally {
      e.target.value = '';
    }
  });

  // ===================== AVATAR upload =====================
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
      alert('שגיאה בהעלאת תמונת פרופיל');
    } finally {
      e.target.value = '';
    }
  });

  // ---------- graphs ----------
  const paintGraph = (m) => {
    const stats = getStats();
    const slot  = root.querySelector('#ppGraphSlot');
    if (slot) slot.innerHTML = graphHTML(stats, m);
  };
  paintGraph(mode);

  // ---------- toggles ----------
  const toggles = [...root.querySelectorAll('.pp-arch-toggle')];
  const panels  = {
    done:    root.querySelector('.pp-arch[data-arch="done"]'),
    removed: root.querySelector('.pp-arch[data-arch="removed"]')
  };
  toggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-toggle');
      toggles.forEach(b => b.classList.toggle('is-active', b === btn));
      toggles.forEach(b => b.setAttribute('aria-selected', String(b === btn)));
      Object.entries(panels).forEach(([k, el]) => el?.toggleAttribute('hidden', k !== name));
      paintGraph(name);
    });
  });

  // ---------- quick range ----------
  root.querySelectorAll('.pp-range').forEach(chip => {
    chip.addEventListener('click', () => {
      root.querySelectorAll('.pp-range').forEach(c => c.classList.toggle('is-active', c === chip));
      const range = chip.getAttribute('data-range');

      const dayStart = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
      const now = new Date(), t0 = dayStart(now);
      const ranges = {
        today:     { from: t0,                      to: new Date(+t0 + 86400000) },
        yesterday: { from: new Date(+t0 - 86400000), to: t0 },
        '7d':      { from: new Date(+t0 - 6*86400000), to: new Date(+t0 + 86400000) },
        '30d':     { from: new Date(+t0 - 29*86400000), to: new Date(+t0 + 86400000) },
      };
      const r = ranges[range];
      const inRange = (ts) => ts >= r.from && ts < r.to;

      const rebuild = (panel, arr, kind) => {
        const byR = arr.filter(t => inRange(new Date((kind==='done'?t.completedAt:t.removedAt) || t.date || Date.now())));
        const groups = groupByDateThenTime(byR);
        panel.innerHTML = groups.length
          ? groups.map(([dk, xs]) => dateSection(dk, xs, kind)).join('')
          : `<div class="pp-emptyli">${kind==='done'?'אין משימות שבוצעו':'אין משימות שבוטלו'} בטווח זה</div>`;
        panel.insertAdjacentHTML('beforeend', `<div class="pp-summary" dir="rtl">סה״כ: <b>${byR.length}</b></div>`);
      };

      rebuild(panels.done,    _getAllDone?.()||[],    'done');
      rebuild(panels.removed, _getAllRemoved?.()||[], 'removed');
    });
  });

  // ---------- archive actions ----------
  root.addEventListener('click', (e)=>{
    const del = e.target.closest('[data-delperm]');
    const rep = e.target.closest('[data-repeat]');
    if (!del && !rep) return;

    const id   = (del||rep).getAttribute('data-id');
    const kind = (del||rep).getAttribute('data-kind');

    if (del) {
      if (!confirm('למחוק לצמיתות? אי אפשר לבטל.')) return;
      permaDelete?.(id, kind);
      document.dispatchEvent(new Event(EVENTS_CHANGED));
      return;
    }

    if (rep) {
      const src = (kind==='done' ? _getAllDone() : _getAllRemoved()).find(t => String(t.id) === String(id));
      if (!src) return;
      const now = new Date();
      addEvent?.({
        date: keyOf(now),
        time: src.time || `${pad2(now.getHours())}:${pad2(now.getMinutes())}`,
        title: src.title || 'ללא כותרת',
        done: false
      });
      document.dispatchEvent(new Event(EVENTS_CHANGED));
      alert('המשימה הוחזרה לרשימת המשימות להיום');
    }
  });

  // ---------- follow (scoped per user) ----------
  const $followBtn = root.querySelector('[data-act="follow"]');
  const $followers = root.querySelector('#ppFollowers');
  if ($followBtn && $followers){
    const paint = () => {
      const on = (lsGet(K.IS_FOLLOW) || '0') === '1';
      $followBtn.classList.toggle('is-on', on);
      $followBtn.textContent = on ? 'עוקב ✓' : 'עקוב';
    };
    paint();

    $followBtn.addEventListener('click', () => {
      const was = (lsGet(K.IS_FOLLOW) || '0') === '1';
      lsSet(K.IS_FOLLOW, was ? '0' : '1');

      const cur  = Number(lsGet(K.FOLLOWERS) || '0');
      const next = was ? Math.max(0, cur - 1) : cur + 1;
      lsSet(K.FOLLOWERS, String(next));
      $followers.textContent = String(next);
      paint();
    });
  }

  // ---------- live refresh ----------
  const refreshAll = () => {
    const app = document.getElementById('app');
    const modeNow =
      root.querySelector('.pp-arch-toggle.is-active')?.getAttribute('data-toggle') || 'done';

    app.innerHTML = renderProfile(modeNow);

    // Re-apply cover on every remount
    paintCoverFromLS(app);

    wire(app, modeNow);
  };

  document.addEventListener(EVENTS_CHANGED, refreshAll);
  document.addEventListener(STATS_CHANGED,  refreshAll);
} // end wire()
