// /src/pages/profile.js
// Profile (RTL, iPhone 12+). Live graph (last 7 days) + archives.
// NEW: Social activity lists (liked/commented posts) without a graph.

import profileLogo from '../icons/profile-logo.png';
import {
  _getAllActive, _getAllDone, _getAllRemoved,
  permaDelete, addEvent
} from '../utils/events.js';
import { getSocialActivity } from '../pages/social.js';   // <-- social activity

const $ = (s, r = document) => r.querySelector(s);

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

const esc  = v => (window.CSS && CSS.escape ? CSS.escape(v) : String(v));
const pad2 = n => String(n).padStart(2,'0');
const keyOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

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
  series.forEach((s,i)=>{ d += `${i ? 'L' : 'M'} ${pad + i*step},${y(s.n)} `; });
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

/* ========== Graph HTML (mode: 'done' | 'removed') ========== */
function graphHTML(stats, mode='done'){
  const W=296,H=120,P=18;
  const series = mode==='done' ? stats.bucketsDone : stats.bucketsRem;
  const gxs    = grid(series.length, W, H, P);
  const ds     = dots(series, W, H, P);
  const title  = mode==='done' ? 'בוצעו' : 'בוטלו';

  return `
    <div class="pp-graph" data-mode="${mode}" dir="rtl">
      <svg class="pp-svg" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" aria-label="גרף 7 ימים">
        <defs>
          <linearGradient id="ppArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stop-color="currentColor" stop-opacity=".25"/>
            <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
          </linearGradient>
        </defs>

        ${gxs.map(x => `<line x1="${x}" y1="${P}" x2="${x}" y2="${H-P}" class="pp-grid"/>`).join('')}
        <line x1="${P}" y1="${H-P}" x2="${W-P}" y2="${H-P}" class="pp-grid"/>

        <g class="pp-series">
          <g class="pp-area-wrap" style="color:var(--pp-active)"><path d="${pathArea(series, W, H, P)}" fill="url(#ppArea)"/></g>
          <path d="${pathLine(series, W, H, P)}" class="pp-line" style="color:var(--pp-active)"/>
          ${ds.map(d => `
            <circle cx="${d.x}" cy="${d.y}" r="4" class="pp-dot"/>
            ${d.isLast ? `
              <g transform="translate(${d.x+6}, ${d.y-16})" class="pp-badge">
                <rect rx="6" ry="6" width="28" height="16"></rect>
                <text x="14" y="12" text-anchor="middle">${d.n}</text>
              </g>` : '' }
          `).join('')}
        </g>
      </svg>

      <div class="pp-legend" dir="rtl">
        <span class="pp-leg"><i class="pp-swatch"></i>${title}</span>
        <span class="pp-sub">בשבעת הימים האחרונים</span>
      </div>

      <div class="pp-ticks" dir="rtl">
        ${Array.from({length:7}, (_,i)=> i===6 ? '<span class="pp-tick">היום</span>' : '<span class="pp-tick"></span>').join('')}
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
  const time  = (t.time || '00:00').trim();
  const title = (t.title || 'ללא כותרת').trim();
  const dim   = (kind === 'done') ? ' is-archived' : '';
  return `
    <li class="pp-taskli${dim}" dir="rtl">
      <span class="pp-time" dir="ltr">${time}</span>
      <span class="pp-title">${title}</span>
      <span class="pp-actions" dir="ltr">
        <button class="pp-repeat"  title="חזור על המשימה" data-repeat data-id="${t.id}" data-kind="${kind}" aria-label="חזור">↻</button>
        <button class="pp-delperm" title="מחק לצמיתות"    data-delperm data-id="${t.id}" data-kind="${kind}" aria-label="מחק">🗑</button>
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
        <span class="pp-dlabel" dir="ltr">${nice}</span>
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
    const title = p?.title || p?.text || 'ללא כותרת';
    const time  = entry.time || '00:00';
    const date  = entry.dateKey || '';
    const extra = isComment ? `<span class="pp-note">“${(entry.text||'').slice(0,60)}”</span>` : '';
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
function headerHTML(mode='done'){
  // counters exist
  if (localStorage.getItem(K.FOLLOWERS) == null) localStorage.setItem(K.FOLLOWERS, '0');
  if (localStorage.getItem(K.FOLLOWING) == null) localStorage.setItem(K.FOLLOWING, '0');

  const cover   = localStorage.getItem(K.COVER)  || '';
  const avatar  = localStorage.getItem(K.AVATAR) || '';
  const isOn    = (localStorage.getItem(K.IS_FOLLOW) || '0') === '1';

  const fullName = () => {
    const f = localStorage.getItem(K.NAME) || 'אורח';
    const l = localStorage.getItem(K.SUR)  || '';
    return l ? `${f} ${l}` : f;
  };
  const handle = () => localStorage.getItem(K.HANDLE) || '@looz_user';

  const stats = getStats();

  return `
  <main class="profile-page o-wrap" dir="rtl">
    <header class="topbar">
      <button class="navbtn" data-act="back" aria-label="חזרה">‹</button>
      <h1 class="title">פרופיל</h1>
      <button class="looz-mini-btn" data-act="home" aria-label="עמוד ראשי">
        <img class="looz-mini" src="${profileLogo}" alt="LooZ" />
      </button>
    </header>

    <section class="pp-cover" style="${cover ? `--cover:url(${esc(cover)})` : ''}">
      <input id="ppCoverInput" type="file" accept="image/*" hidden>
      <button class="pp-editbtn pp-editbtn--cover" type="button" data-edit="cover" aria-label="החלפת תמונת רקע">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l1 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1-2Zm3 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-2.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" fill="currentColor"/></svg>
      </button>
    </section>

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

    ${sparklessCounters(stats)}
    ${archivesHTML('today')}
    ${socialActivityHTML()}

    <div class="pp-space"></div>
  </main>
  `;
}

/* ===================== wiring ===================== */
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
  target.innerHTML = headerHTML('done');
  wire(target, 'done');  // initial graph mode
}
export default { mount };

function wire(root, mode='done'){
  document.body.setAttribute('data-view', 'profile');

  // hide global CTA on this page
  document.querySelectorAll('.c-bottom-cta, .c-cta, .btn-create-orb')
    .forEach(el => el.style.display = 'none');

  // nav
  $('[data-act="back"]', root)?.addEventListener('click', () => history.back());
  $('[data-act="home"]', root)?.addEventListener('click', async () => {
    const { mount } = await import('./home.js');
    mount(document.getElementById('app'));
  });

  // uploads
  root.querySelector('[data-edit="cover"]')?.addEventListener('click', () =>
    $('#ppCoverInput', root)?.click()
  );
  root.querySelector('[data-edit="avatar"]')?.addEventListener('click', () =>
    $('#ppAvatarInput', root)?.click()
  );
  $('#ppCoverInput', root)?.addEventListener('change', async e => {
    const f = e.target.files?.[0]; if (!f) return;
    const data = await fileToDataURL(f);
    localStorage.setItem(K.COVER, data);
    root.querySelector('.pp-cover')?.setAttribute('style', `--cover:url(${esc(data)})`);
  });
  $('#ppAvatarInput', root)?.addEventListener('change', async e => {
    const f = e.target.files?.[0]; if (!f) return;
    const data = await fileToDataURL(f);
    localStorage.setItem(K.AVATAR, data);
    root.querySelector('.pp-avatar__img')?.setAttribute('src', data);
  });

  /* ---------- graph ---------- */
  const paintGraph = (m) => {
    const stats = getStats();
    const slot  = root.querySelector('#ppGraphSlot');
    if (slot) slot.innerHTML = graphHTML(stats, m);
  };
  paintGraph(mode);

  /* ---------- toggles ---------- */
  const toggles = [...root.querySelectorAll('.pp-arch-toggle')];
  const panels  = {
    done:    root.querySelector('.pp-arch[data-arch="done"]'),
    removed: root.querySelector('.pp-arch[data-arch="removed"]')
  };
  toggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-toggle'); // done|removed
      toggles.forEach(b => b.classList.toggle('is-active', b === btn));
      toggles.forEach(b => b.setAttribute('aria-selected', String(b === btn)));
      Object.entries(panels).forEach(([k, el]) => el?.toggleAttribute('hidden', k !== name));
      paintGraph(name);
    });
  });

  /* ---------- quick range ---------- */
  root.querySelectorAll('.pp-range').forEach(chip => {
    chip.addEventListener('click', () => {
      root.querySelectorAll('.pp-range').forEach(c => c.classList.toggle('is-active', c === chip));
      const range = chip.getAttribute('data-range'); // today|yesterday|7d|30d

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

  /* ---------- archive actions ---------- */
  root.addEventListener('click', (e)=>{
    const del = e.target.closest('[data-delperm]');
    const rep = e.target.closest('[data-repeat]');
    if (!del && !rep) return;

    const id   = (del||rep).getAttribute('data-id');
    const kind = (del||rep).getAttribute('data-kind'); // 'done'|'removed'
    if (!id) return;

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

  /* ---------- follow ---------- */
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

  /* ---------- live refresh ---------- */
  const refreshAll = ()=>{
    const app = document.getElementById('app');
    const modeNow = root.querySelector('.pp-arch-toggle.is-active')?.getAttribute('data-toggle') || 'done';
    app.innerHTML = headerHTML(modeNow);
    wire(app, modeNow);
  };
  document.addEventListener(EVENTS_CHANGED, refreshAll);
  document.addEventListener(STATS_CHANGED,  refreshAll);
}
