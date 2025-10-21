// /src/pages/day.js
// Day view (id-based ✓/✕, archives to events.done / events.rem, plays effects)

import {
  EVENTS_CHANGED,
  getEventsByDate,   // (dateKey) => [{ id, date, time, title, done }, ...]
  removeEvent,       // (id) -> void
  toggleDone         // (id) -> void  (used for legacy 'done' flag then remove)
} from '../utils/events.js';

import { fxConfetti, fxInkDelete, fxMarkDone, bumpTaskCounter } from '../utils/effects.js';

const STORE_DONE    = 'events.done';
const STORE_REMOVED = 'events.rem';
const STATS_CHANGED = 'stats-changed';

const HEB_DAYS = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];

/* ---------- helpers ---------- */
const pad2 = n => String(n).padStart(2,'0');
const keyOf = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

function dayParts(d){
  const dow = HEB_DAYS[d.getDay()];
  const md  = `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}`;
  return { dow, md };
}
function escapeHTML(s){
  return String(s || '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[m]);
}

// tiny store helpers for archives + stats
const readJSON  = (k,d=[]) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(d)); } catch { return d; } };
const writeJSON = (k,v)   => localStorage.setItem(k, JSON.stringify(v));
function archiveDone(item){ const l = readJSON(STORE_DONE);   l.push({ ...item, done:true,  completedAt: Date.now() }); writeJSON(STORE_DONE, l); }
function archiveRemoved(i){ const l = readJSON(STORE_REMOVED); l.push({ ...i,   deleted:true, removedAt:   Date.now() }); writeJSON(STORE_REMOVED, l); }
function bumpStats({ done=0, removed=0, activeDelta=0 }){
  try {
    const inc = (k, d=1) => localStorage.setItem(k, String(Math.max(0,(parseInt(localStorage.getItem(k)||'0',10)||0)+d)));
    if (done)       inc('profile.done.count', done);
    if (removed)    inc('profile.removed.count', removed);
    if (activeDelta)inc('profile.task.count', activeDelta);
  } catch {}
  document.dispatchEvent(new Event(STATS_CHANGED));
}

function ensureHost(root){
  let host = root.querySelector('#viewRoot') || document.getElementById('viewRoot');
  if(!host){ host = document.createElement('section'); host.id = 'viewRoot'; root.appendChild(host); }
  return host;
}

/* ---------- local state ---------- */
let state = { date: new Date(), cleanup: null };

/* ---------- view ---------- */
function taskCard(task){
  const time = task.time || '—';
  const doneCls = task.done ? ' is-done' : '';
  return `
    <article class="p-datask${doneCls}" data-task data-id="${task.id}">
      <div class="p-time" dir="ltr">${time}</div>
      <div class="p-body"><div class="p-title">${escapeHTML(task.title || 'ללא כותרת')}</div></div>
      <div class="p-actions">
        <button class="p-act p-act--ok" aria-label="בוצע" title="בוצע">✓</button>
        <button class="p-act p-act--no" aria-label="מחק"  title="מחק">✕</button>
      </div>
    </article>
  `;
}
function emptyCard(){
  return `<article class="p-empty">אין משימות להיום. לחץ על הכפתור למטה כדי ליצור משימה חדשה.</article>`;
}

function render(host){
  const dateKey = keyOf(state.date);
  const list = getEventsByDate(dateKey);
  const { dow, md } = dayParts(state.date);

  host.innerHTML = `
    <section class="p-dayview" aria-label="רשימת משימות ליום">
      <header class="p-day-head">
        <div class="p-day-when" aria-live="polite">
          <span class="p-when__dow">${dow}</span>
          <span class="p-when__dot" aria-hidden="true">·</span>
          <span class="p-when__md">${md}</span>
        </div>
      </header>
      <div class="p-tasklist">
        ${list.length ? list.map(taskCard).join('') : emptyCard()}
      </div>
    </section>
  `;

  // delegation for ✓ / ✕
  host.querySelector('.p-tasklist')?.addEventListener('click', (e)=>{
    const okBtn = e.target.closest('.p-act--ok');
    const noBtn = e.target.closest('.p-act--no');
    const card  = e.target.closest('[data-task]');
    if (!card || (!okBtn && !noBtn)) return;

    e.stopPropagation();
    e.preventDefault();

    const id   = card.getAttribute('data-id');
    const item = list.find(x => String(x.id) === String(id));
    if (!id || !item) return;

    if (okBtn) {
      const r = okBtn.getBoundingClientRect();
      fxConfetti(r.left + r.width/2, r.top + r.height/2, { count: 36, ms: 1200 });
      fxMarkDone(card);
      bumpTaskCounter(-1);
      bumpStats({ done: 1, activeDelta: -1 });

      // keep compatibility: some code expects toggleDone to flip a flag; we also remove it from active
      setTimeout(()=> {
        try { toggleDone(id); } catch {}
        try { removeEvent(id); } catch {}
        archiveDone(item);
        document.dispatchEvent(new Event(EVENTS_CHANGED)); // ensure re-renderers fire
      }, 420);
    }

    if (noBtn) {
      fxInkDelete(card);
      bumpTaskCounter(-1);
      bumpStats({ removed: 1, activeDelta: -1 });

      setTimeout(()=> {
        try { removeEvent(id); } catch {}
        archiveRemoved(item);
        document.dispatchEvent(new Event(EVENTS_CHANGED));
      }, 700);
    }
  });
}

/* ---------- lifecycle ---------- */
export function mount(root){
  document.body.setAttribute('data-view','day');
  const host = ensureHost(root);

  // honor a selected date (set by other views)
  try {
    const sel = localStorage.getItem('selectedDate');
    if (sel) state.date = new Date(sel);
  } catch {}

  render(host);

  const onPeriod = (e)=>{
    const dir = e.detail; // 'prev' | 'next' | 'today'
    if(dir==='prev')  state.date = new Date(state.date.getFullYear(), state.date.getMonth(), state.date.getDate()-1);
    if(dir==='next')  state.date = new Date(state.date.getFullYear(), state.date.getMonth(), state.date.getDate()+1);
    if(dir==='today') state.date = new Date();
    render(host);
  };
  const onEvents = ()=> render(host);

  state.cleanup?.();
  document.addEventListener('period-nav', onPeriod);
  document.addEventListener(EVENTS_CHANGED, onEvents);
  state.cleanup = ()=>{
    document.removeEventListener('period-nav', onPeriod);
    document.removeEventListener(EVENTS_CHANGED, onEvents);
  };
}
