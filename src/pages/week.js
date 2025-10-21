// /src/pages/week.js
// Week view (id-based ✓/✕, archives, effects, never navigates on button clicks)

import {
  EVENTS_CHANGED,
  getEventsByDate,   // (dateKey) => [{ id, date, time, title, done }, ...]
  removeEvent,       // (id) -> void
  toggleDone         // (id) -> void
} from '../utils/events.js';

import { fxConfetti, fxInkDelete, fxMarkDone, bumpTaskCounter } from '../utils/effects.js';

/* ---------- archives + stats ---------- */
const STORE_DONE    = 'events.done';
const STORE_REMOVED = 'events.rem';
const STATS_CHANGED = 'stats-changed';

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

/* ---------- date helpers ---------- */
const HEB_DAYS = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const pad2 = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;

function startOfWeekSun(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay()); // 0=Sun..6=Sat
  return x;
}
function buildWeek(anchor) {
  const a = startOfWeekSun(anchor);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(a.getFullYear(), a.getMonth(), a.getDate() + i)
  );
}

/* ---------- local state ---------- */
const state = { cursor: new Date(), cleanup: null };

/* ---------- ensure content slot (#viewRoot) ---------- */
function ensureHost(root) {
  let host = document.getElementById('viewRoot') || root.querySelector('#viewRoot');
  if (!host) {
    host = document.createElement('section');
    host.id = 'viewRoot';
    root.appendChild(host);
  }
  return host;
}

/* ---------- Day-card HTML (same as Day) ---------- */
function escapeHTML(s){ return String(s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function taskCardHTML(t) {
  const doneCls = t.done ? ' is-done' : '';
  return `
    <article class="p-datask${doneCls}" data-task data-id="${t.id}">
      <div class="p-time" dir="ltr">${t.time || '—'}</div>
      <div class="p-body"><div class="p-title">${escapeHTML(t.title || 'ללא כותרת')}</div></div>
      <div class="p-actions">
        <button class="p-act p-act--ok" aria-label="בוצע">✓</button>
        <button class="p-act p-act--no" aria-label="מחק">✕</button>
      </div>
    </article>
  `;
}

/* ---------- render full week list ---------- */
function render(host) {
  const days = buildWeek(state.cursor);

  host.innerHTML = `
    <section class="p-weekwrap" aria-label="תצוגת שבוע">
      <ul class="w-list" role="list">
        ${days.map((d, idx) => {
          const k   = keyOf(d);
          const cnt = getEventsByDate(k).length;
          const isToday = keyOf(new Date()) === k;
          return `
            <li class="w-dayrow${isToday ? ' w-dayrow--today' : ''}" data-date="${k}">
              <header class="w-rowhead" role="button" tabindex="0" aria-expanded="false">
                <span class="w-left"  aria-label="יום בשבוע">${HEB_DAYS[idx]}</span>
                <span class="w-count" aria-label="מספר משימות">${cnt}</span>
                <span class="w-right" aria-label="תאריך" dir="ltr">${pad2(d.getDate())}.${pad2(d.getMonth()+1)}</span>
              </header>
              <div class="w-detail" hidden>
                <div class="w-detail__slot" data-slot></div>
              </div>
            </li>
          `;
        }).join('')}
      </ul>
    </section>
  `;

  hookRowInteractions(host);
}

/* ---------- fill one opened row with that day's tasks ---------- */
function renderDetailInto(row) {
  const k     = row.dataset.date;
  const slot  = row.querySelector('[data-slot]');
  const items = getEventsByDate(k);

  if (!items.length) {
    slot.innerHTML = `<article class="p-empty">אין משימות ליום זה.</article>`;
  } else {
    slot.innerHTML = `
      <section class="p-dayview" role="region" aria-label="רשימת משימות ליום">
        <div class="p-tasklist">
          ${items.map(taskCardHTML).join('')}
        </div>
      </section>
    `;
  }

  const detail = row.querySelector('.w-detail');
  detail.style.maxHeight = slot.scrollHeight + 12 + 'px';
}

function hookRowInteractions(host) {
  const rows = host.querySelectorAll('.w-dayrow');

  rows.forEach((row) => {
    const head   = row.querySelector('.w-rowhead');
    const detail = row.querySelector('.w-detail');
    const slot   = row.querySelector('[data-slot]');
    const k      = row.dataset.date;

    const openRow = () => {
      row.classList.add('is-open');
      head.setAttribute('aria-expanded', 'true');
      detail.hidden = false;
      renderDetailInto(row);
    };

    head.addEventListener('click', () => {
      if (row.classList.contains('is-open')) {
        document.dispatchEvent(new CustomEvent('go-day', { detail: k }));
      } else openRow();
    });
    head.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (row.classList.contains('is-open')) {
          document.dispatchEvent(new CustomEvent('go-day', { detail: k }));
        } else openRow();
      }
    });

    // delegation inside the row
    row.addEventListener('click', (e) => {
      const target = e.target;
      const card  = target.closest('[data-task]');
      const okBtn = target.closest('.p-act--ok');
      const noBtn = target.closest('.p-act--no');

      if ((okBtn || noBtn) && card) {
        e.stopPropagation();
        e.preventDefault();

        const id   = card.getAttribute('data-id');
        const item = getEventsByDate(k).find(x => String(x.id) === String(id));
        if (!id || !item) return;

        if (okBtn) {
          const r = okBtn.getBoundingClientRect();
          fxConfetti(r.left + r.width/2, r.top + r.height/2, { count: 36, ms: 1200 });
          fxMarkDone(card);
          bumpTaskCounter(-1);
          bumpStats({ done: 1, activeDelta: -1 });

          setTimeout(() => {
            try { toggleDone(id); } catch {}
            try { removeEvent(id); } catch {}
            archiveDone(item);
            row.querySelector('.w-count').textContent = String(getEventsByDate(k).length);
            document.dispatchEvent(new Event(EVENTS_CHANGED));
            renderDetailInto(row);
          }, 420);
        }

        if (noBtn) {
          fxInkDelete(card);
          bumpTaskCounter(-1);
          bumpStats({ removed: 1, activeDelta: -1 });

          setTimeout(() => {
            try { removeEvent(id); } catch {}
            archiveRemoved(item);
            row.querySelector('.w-count').textContent = String(getEventsByDate(k).length);
            document.dispatchEvent(new Event(EVENTS_CHANGED));
            renderDetailInto(row);
          }, 700);
        }
        return; // don't fall-through to day navigation
      }

      if (card) document.dispatchEvent(new CustomEvent('go-day', { detail: k }));
    });
  });
}

/* ---------- lifecycle ---------- */
export function mount(root) {
  document.body.setAttribute('data-view', 'week');
  const host = ensureHost(root);

  // anchor week on selected date if any
  try {
    const sel = localStorage.getItem('selectedDate');
    if (sel) state.cursor = new Date(sel);
  } catch {}

  render(host);

  const onPeriod = (e) => {
    const dir = e.detail; // 'prev' | 'next' | 'today'
    if (dir === 'prev')  state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), state.cursor.getDate() - 7);
    if (dir === 'next')  state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), state.cursor.getDate() + 7);
    if (dir === 'today') state.cursor = new Date();
    render(host);
  };
  const onEvents = () => render(host);

  document.addEventListener('period-nav', onPeriod);
  document.addEventListener(EVENTS_CHANGED, onEvents);

  state.cleanup?.();
  state.cleanup = () => {
    document.removeEventListener('period-nav', onPeriod);
    document.removeEventListener(EVENTS_CHANGED, onEvents);
  };
}
