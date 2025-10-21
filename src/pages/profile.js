// /src/pages/profile.js
// Profile with centered archive controls, date filters, toddler-friendly TWO-SERIES graph,
// permanent-delete in archives, and your social icons restored. No dependency on events.js.

import profileLogo from '../icons/profile-logo.png';

const $ = (s, r = document) => r.querySelector(s);

// keys we already use across the app
const K = {
  AVATAR:     'profile.avatar',
  COVER:      'profile.cover',
  NAME:       'firstName',
  SUR:        'lastName',
  HANDLE:     'profile.handle',
  FOLLOWERS:  'profile.followers',
  FOLLOWING:  'profile.following',
  IS_FOLLOW:  'profile.is_followed',
};

const EVENTS_CHANGED = 'events-changed';
const STATS_CHANGED  = 'stats-changed';

// ---------- tiny utils ----------
const esc  = v => (window.CSS && CSS.escape ? CSS.escape(v) : String(v));
const pad2 = n => String(n).padStart(2,'0');
const keyOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

function fullName() {
  const f = localStorage.getItem(K.NAME) || 'אורח';
  const l = localStorage.getItem(K.SUR)  || '';
  return l ? `${f} ${l}` : f;
}
function handle() { return localStorage.getItem(K.HANDLE) || '@looz_user'; }

function readJSON(k, d = []) { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); } catch { return d; } }
function writeJSON(k, v)     { localStorage.setItem(k, JSON.stringify(v)); }

// canonical stores used by day/week
const STORE_ACTIVE  = 'events';
const STORE_DONE    = 'events.done';
const STORE_REMOVED = 'events.rem';

// local helpers (no import from events.js needed)
function _getAllActive()  { return readJSON(STORE_ACTIVE); }
function _getAllDone()    { return readJSON(STORE_DONE); }
function _getAllRemoved() { return readJSON(STORE_REMOVED); }

// date range query for archives
function queryArchive(kind /* 'done'|'removed' */, { from, to } = {}) {
  const list = (kind === 'done' ? _getAllDone() : _getAllRemoved()).slice();
  if (!from && !to) return list;

  const fromT = from ? new Date(from + 'T00:00:00').getTime() : -Infinity;
  const toT   = to   ? new Date(to   + 'T23:59:59').getTime() :  Infinity;

  return list.filter(it => {
    const stamp = new Date(kind === 'done' ? (it.completedAt || it.date) : (it.removedAt || it.date)).getTime();
    return stamp >= fromT && stamp <= toT;
  });
}

// permanently remove a single archived item by id
function permaDelete(id, kind /* 'done' | 'removed' */) {
  const key = (kind === 'done') ? STORE_DONE : STORE_REMOVED;
  const next = readJSON(key).filter(x => String(x.id) !== String(id));
  writeJSON(key, next);
  // let the page re-render
  document.dispatchEvent(new Event(EVENTS_CHANGED));
  document.dispatchEvent(new Event(STATS_CHANGED));
}

// ---------- grouping & stats ----------
function groupByDateThenTime(list){
  const map = new Map();
  for (const t of list){
    const d = new Date(t.completedAt || t.removedAt || t.date || Date.now());
    const k = keyOf(d);
    (map.get(k) || map.set(k, []).get(k)).push(t);
  }
  for (const [, arr] of map) arr.sort((a,b)=>(a.time||'00:00').localeCompare(b.time||'00:00'));
  return [...map.entries()].sort((a,b)=> b[0].localeCompare(a[0])); // newest date first
}

function getStats(){
  const active  = _getAllActive();
  const done    = _getAllDone();
  const removed = _getAllRemoved();

  // 7 buckets (last 6 days + today) SPLIT into two series
  const now = new Date();
  const mk = ()=>Array.from({length:7}, ()=>({ n:0 }));
  const bucketsDone = mk();
  const bucketsRem  = mk();

  for (const it of done){
    const d = new Date(it.completedAt || it.date || Date.now());
    const diff = Math.floor((now - d) / 86400000);
    if (diff >= 0 && diff < 7) bucketsDone[6 - diff].n++;
  }
  for (const it of removed){
    const d = new Date(it.removedAt || it.date || Date.now());
    const diff = Math.floor((now - d) / 86400000);
    if (diff >= 0 && diff < 7) bucketsRem[6 - diff].n++;
  }

  const total = active.length + done.length + removed.length;
  return { total, done: done.length, del: removed.length, bucketsDone, bucketsRem };
}

// ---------- graph helpers (two series, thick & simple) ----------
const GRAPH_W = 296, GRAPH_H = 84, PAD = 14;
function yScale(n, max){ return GRAPH_H - PAD - (n / Math.max(1, max)) * (GRAPH_H - PAD*2); }
function pathFromSeries(series, max){
  const step = (GRAPH_W - PAD*2) / (series.length - 1);
  return series.map((s,i) => `${i ? 'L' : 'M'} ${PAD + i*step},${yScale(s.n, max)}`).join(' ');
}
function dotsFromSeries(series, max){
  const step = (GRAPH_W - PAD*2) / (series.length - 1);
  return series.map((s,i)=>({ x: PAD + i*step, y: yScale(s.n, max), n: s.n, isLast: i===series.length-1 }));
}

// ---------- HTML ----------
function headerCardHTML({ total, done, del, bucketsDone, bucketsRem }){
  const max = Math.max(
    1,
    ...bucketsDone.map(s=>s.n),
    ...bucketsRem.map(s=>s.n)
  );

  const dotsDone = dotsFromSeries(bucketsDone, max);
  const dotsRem  = dotsFromSeries(bucketsRem,  max);

  // Colors: keep brand vibe, but distinct
  const COL_DONE = '#6EA8FF';  // blue
  const COL_REM  = '#FFC85C';  // golden/yellow

  return `
    <section class="pp-card pp-stats" aria-label="סטטיסטיקה">
      <div class="pp-statrow">
        <div class="pp-stat"><span class="pp-num">${total}</span><span class="pp-lbl">סה״כ</span></div>
        <div class="pp-stat"><span class="pp-num">${done}</span><span class="pp-lbl">בוצעו</span></div>
        <div class="pp-stat"><span class="pp-num">${del}</span><span class="pp-lbl">בוטלו</span></div>
      </div>

      <svg class="pp-spark" viewBox="0 0 ${GRAPH_W} ${GRAPH_H}" width="100%" height="${GRAPH_H}" aria-hidden="true">
        <!-- removed first (under), done second (over) -->
        <path d="${pathFromSeries(bucketsRem,  max)}" fill="none" stroke="${COL_REM}"  stroke-width="5" stroke-linecap="round" opacity=".9"/>
        <path d="${pathFromSeries(bucketsDone, max)}" fill="none" stroke="${COL_DONE}" stroke-width="5" stroke-linecap="round"/>

        ${dotsRem.map(d  => `<circle cx="${d.x}" cy="${d.y}" r="4" fill="${COL_REM}"  opacity=".95"/>`).join('')}
        ${dotsDone.map(d => `<circle cx="${d.x}" cy="${d.y}" r="4" fill="${COL_DONE}" opacity="1"/>`).join('')}

        <!-- label only at the last x, low-contrast -->
        <text x="${dotsDone.at(-1).x}" y="${GRAPH_H - 6}" font-family="system-ui" font-size="11" text-anchor="middle" fill="#555">היום</text>
      </svg>

      <div class="pp-legend">
        <span class="pp-key" style="--c:${COL_DONE}"></span><b>בוצעו</b>
        <span class="pp-key" style="--c:${COL_REM}"></span><b>בוטלו</b>
      </div>

      <div class="pp-sub">בצעו + בוטלו בשבעת הימים האחרונים</div>
    </section>
  `;
}

function archiveControlsHTML(){
  return `
    <div class="pp-arch-head">
      <button class="pp-arch-toggle" data-toggle="done" aria-expanded="false">היסטוריית משימות שבוצעו</button>
      <button class="pp-arch-toggle" data-toggle="removed" aria-expanded="false">היסטוריית משימות שבוטלו</button>
    </div>
  `;
}
function dateFilterHTML(kind){
  const id = kind === 'done' ? 'done' : 'removed';
  return `
    <div class="pp-filters">
      <label>מ־<input type="date" id="ppFrom-${id}"></label>
      <label>עד־<input type="date" id="ppTo-${id}"></label>
      <button class="pp-filterbtn" data-filter="${id}">סנן</button>
    </div>
  `;
}
function liRow(t, kind){
  const time = (t.time || '').trim() || '—';
  const title = (t.title || 'ללא כותרת');
  return `<li class="pp-taskli is-archived">
    <span class="pp-time" dir="ltr">${time}</span>
    <span class="pp-title">${title}</span>
    <button class="pp-delperm" data-delperm data-kind="${kind}" data-id="${t.id}" title="מחק לצמיתות">🗑</button>
  </li>`;
}
function dateSection(dateKey, arr, kind){
  const [y,m,d] = dateKey.split('-');
  const nice = `${d}.${m}`;
  return `
    <details class="pp-dsec">
      <summary class="pp-dsum">
        <span class="pp-dlabel" dir="ltr">${nice}</span>
        <span class="pp-dcount">(${arr.length})</span>
      </summary>
      <ul class="pp-list">
        ${arr.map(t => liRow(t, kind)).join('')}
      </ul>
    </details>
  `;
}
function archivesHTML(){
  const doneGroups    = groupByDateThenTime(_getAllDone());
  const removedGroups = groupByDateThenTime(_getAllRemoved());
  return `
    <section class="pp-card">
      ${archiveControlsHTML()}

      <div class="pp-arch" data-arch="done" hidden>
        ${dateFilterHTML('done')}
        ${doneGroups.length
          ? doneGroups.map(([dk, arr]) => dateSection(dk, arr, 'done')).join('')
          : `<div class="pp-emptyli">אין משימות שבוצעו</div>`}
        <div class="pp-summary">סה״כ: <b>${_getAllDone().length}</b></div>
      </div>

      <div class="pp-arch" data-arch="removed" hidden>
        ${dateFilterHTML('removed')}
        ${removedGroups.length
          ? removedGroups.map(([dk, arr]) => dateSection(dk, arr, 'removed')).join('')
          : `<div class="pp-emptyli">אין משימות שבוטלו</div>`}
        <div class="pp-summary">סה״כ: <b>${_getAllRemoved().length}</b></div>
      </div>
    </section>
  `;
}

function template(){
  // ensure counters exist
  if (localStorage.getItem(K.FOLLOWERS) == null) localStorage.setItem(K.FOLLOWERS, '0');
  if (localStorage.getItem(K.FOLLOWING) == null) localStorage.setItem(K.FOLLOWING, '0');

  const cover   = localStorage.getItem(K.COVER)  || '';
  const avatar  = localStorage.getItem(K.AVATAR) || '';
  const isOn    = (localStorage.getItem(K.IS_FOLLOW) || '0') === '1';
  const stats   = getStats();

  return `
  <main class="profile-page o-wrap" dir="rtl">
    <header class="topbar">
      <button class="navbtn" data-act="back" aria-label="חזרה">‹</button>
      <h1 class="title">פרופיל</h1>
      <button class="looz-mini-btn" data-act="home" aria-label="עמוד ראשי">
        <img class="looz-mini" src="${profileLogo}" alt="LooZ" />
      </button>
    </header>

    <!-- Cover -->
    <section class="pp-cover" style="${cover ? `--cover:url(${esc(cover)})` : ''}">
      <input id="ppCoverInput" type="file" accept="image/*" hidden>
      <button class="pp-editbtn pp-editbtn--cover" type="button" data-edit="cover" aria-label="החלפת תמונת רקע">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l1 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1-2Zm3 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-2.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" fill="currentColor"/></svg>
      </button>
    </section>

    <!-- Head -->
    <section class="pp-card pp-head">
      <div class="pp-avatar">
        <img class="pp-avatar__img" src="${avatar}" alt="">
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
        <div class="pp-count"><b id="ppFollowers">${Number(localStorage.getItem(K.FOLLOWERS) || '0')}</b><span>עוקבים</span></div>
        <div class="pp-count"><b id="ppFollowing">${Number(localStorage.getItem(K.FOLLOWING) || '0')}</b><span>נעקבים</span></div>
        <div class="pp-count"><b>${stats.total}</b><span>משימות</span></div>
      </div>
    </section>

    ${headerCardHTML(stats)}

    <section class="pp-card pp-stats-legend">
      <div class="pp-legend-row">
        <span class="pp-key" style="--c:#6EA8FF"></span><b>בוצעו</b>
        <span class="pp-key" style="--c:#FFC85C"></span><b>בוטלו</b>
      </div>
    </section>

    ${archivesHTML()}

    <!-- Social bar (restored) -->
    <div class="pp-socialbar" role="group" aria-label="קישורים חברתיים">
      <a class="pp-socbtn" href="#" aria-label="Facebook"  title="Facebook">
        <svg viewBox="0 0 24 24"><path d="M13 22V12h3l1-3h-4V7c0-.9.3-1.5 1.7-1.5H17V2.2c-.8-.1-1.7-.2-2.5-.2C12 2 10.9 3.7 11 6v3H8v3h3v10h2Z"/></svg>
      </a>
      <a class="pp-socbtn" href="#" aria-label="Instagram" title="Instagram">
        <svg viewBox="0 0 24 24"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm6.5-.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z"/></svg>
      </a>
      <a class="pp-socbtn" href="#" aria-label="TikTok"    title="TikTok">
        <svg viewBox="0 0 24 24"><path d="M14 3h3c.2 2 1.5 4 4 4v3c-1.7 0-3.3-.6-4.6-1.6V16a5 5 0 1 1-5-5h.6V7H14v2.8A8 8 0 0 0 21 11V8a7 7 0 0 1-7-5Z"/></svg>
      </a>
      <a class="pp-socbtn" href="#" aria-label="YouTube"  title="YouTube">
        <svg viewBox="0 0 24 24"><path d="M23 12s0-3.5-.5-5.1c-.3-1-1.2-1.8-2.2-2C18.7 4.3 12 4.3 12 4.3s-6.7 0-8.3.6c-1 .3-1.9 1-2.2 2C1 8.5 1 12 1 12s0 3.5.5 5.1c.3 1 1.2 1.8 2.2 2C5.3 19.7 12 19.7 12 19.7s6.7 0 8.3-.6c1-.3 1.9-1 2.2-2 .5-1.6.5-5.1.5-5.1ZM10 8.8l5.8 3.2L10 15.2V8.8Z"/></svg>
      </a>
      <a class="pp-socbtn" href="#" aria-label="X"        title="X">
        <svg viewBox="0 0 24 24"><path d="M3 3h3.6l5.2 7 5.8-7H22l-7.5 9.3L22 21h-3.6l-5.8-7.5L7 21H2.5l7.9-9.7L3 3Z"/></svg>
      </a>
      <a class="pp-socbtn" href="#" aria-label="LinkedIn" title="LinkedIn">
        <svg viewBox="0 0 24 24"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 8.98h3.96V21H3V8.98Zm6.49 0H13.3v1.63h.05c.6-1.13 2.06-2.33 4.24-2.33 4.54 0 5.38 2.99 5.38 6.88V21h-3.96v-5.36c0-1.28-.02-2.93-1.78-2.93-1.78 0-2.05 1.39-2.05 2.83V21H9.49V8.98Z"/></svg>
      </a>
    </div>

    <div class="pp-space"></div>
  </main>
  `;
}

// ---------- wire ----------
function wire(root){
  document.body.setAttribute('data-view', 'profile');

  // hide global CTA
  document.querySelectorAll('.c-bottom-cta, .c-cta, .btn-create-orb')
    .forEach(el => el.style.display = 'none');

  $('[data-act="back"]', root)?.addEventListener('click', () => history.back());
  $('[data-act="home"]', root)?.addEventListener('click', async () => {
    const { mount } = await import('./home.js');
    mount(document.getElementById('app'));
  });

  // Follow toggle
  const $followBtn = root.querySelector('[data-act="follow"]');
  const $followers = root.querySelector('#ppFollowers');
  if ($followBtn && $followers){
    const paint = () => {
      const on = (localStorage.getItem(K.IS_FOLLOW) || '0') === '1';
      $followBtn.classList.toggle('is-on', on);
      $followBtn.textContent = on ? 'עוקב ✓' : 'עקוב';
    };
    paint();
    $followBtn.addEventListener('click', () => {
      const was = (localStorage.getItem(K.IS_FOLLOW) || '0') === '1';
      localStorage.setItem(K.IS_FOLLOW, was ? '0' : '1');
      const cur  = Number(localStorage.getItem(K.FOLLOWERS) || '0');
      const next = was ? Math.max(0, cur - 1) : cur + 1;
      localStorage.setItem(K.FOLLOWERS, String(next));
      $followers.textContent = String(next);
      paint();
    });
  }

  // cover/avatar uploads
  root.querySelector('[data-edit="cover"]')?.addEventListener('click', () =>
    root.querySelector('#ppCoverInput')?.click()
  );
  root.querySelector('[data-edit="avatar"]')?.addEventListener('click', () =>
    root.querySelector('#ppAvatarInput')?.click()
  );
  root.querySelector('#ppCoverInput')?.addEventListener('change', async e => {
    const f = e.target.files?.[0]; if (!f) return;
    const data = await fileToDataURL(f);
    localStorage.setItem(K.COVER, data);
    root.querySelector('.pp-cover')?.setAttribute('style', `--cover:url(${esc(data)})`);
  });
  root.querySelector('#ppAvatarInput')?.addEventListener('change', async e => {
    const f = e.target.files?.[0]; if (!f) return;
    const data = await fileToDataURL(f);
    localStorage.setItem(K.AVATAR, data);
    root.querySelector('.pp-avatar__img')?.setAttribute('src', data);
  });

  // Archive toggles (centered buttons)
  root.querySelectorAll('.pp-arch-toggle').forEach(btn => {
    btn.addEventListener('click', ()=>{
      const name = btn.getAttribute('data-toggle'); // 'done' | 'removed'
      const panel = root.querySelector(`.pp-arch[data-arch="${name}"]`);
      const open = !panel.hasAttribute('hidden');
      panel.toggleAttribute('hidden', open);
      btn.setAttribute('aria-expanded', String(!open));
    });
  });

  // Date filters
  root.querySelectorAll('.pp-filterbtn').forEach(btn => {
    btn.addEventListener('click', ()=>{
      const kind = btn.getAttribute('data-filter'); // 'done' | 'removed'
      const from = (root.querySelector(`#ppFrom-${kind}`)?.value) || undefined;
      const to   = (root.querySelector(`#ppTo-${kind}`)?.value)   || undefined;

      const list = queryArchive(kind, { from, to });
      const groups = groupByDateThenTime(list);
      const panel  = root.querySelector(`.pp-arch[data-arch="${kind}"]`);
      const summary = panel.querySelector('.pp-summary');

      const content = groups.length
        ? groups.map(([dk, arr]) => dateSection(dk, arr, kind)).join('')
        : `<div class="pp-emptyli">אין תוצאות בטווח שנבחר</div>`;

      // Keep filters at top
      const filters = panel.querySelector('.pp-filters');
      panel.innerHTML = '';
      panel.appendChild(filters);
      panel.insertAdjacentHTML('beforeend', content);
      panel.appendChild(summary);
    });
  });

  // Permanent delete (delegation)
  root.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-delperm]');
    if (!btn) return;
    const id   = btn.getAttribute('data-id');
    const kind = btn.getAttribute('data-kind'); // 'done' | 'removed'
    if (!id) return;
    if (!confirm('למחוק לצמיתות? אי אפשר לבטל.')) return;
    permaDelete(id, kind);
  });

  const refresh = ()=>{
    const target = document.getElementById('app');
    target.innerHTML = template();
    wire(target);
  };
  document.addEventListener(EVENTS_CHANGED, refresh);
  document.addEventListener(STATS_CHANGED,  refresh);
}

function fileToDataURL(file){
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

export function mount(root){
  const target = root || document.getElementById('app') || document.body;
  target.innerHTML = template();
  wire(target);
}
export default { mount };
