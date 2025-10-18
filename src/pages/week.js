// /src/pages/week.js
// Week view: closed row = same height/shape vibe as one Day card.
// Clicking a row opens it and shows that day's tasks using the EXACT same
// markup/classes as Day view (p-datask, p-time, p-body, p-title, p-actions).

import {
  EVENTS_CHANGED,
  getEventsByDate,   // (dateKey) => [{ id, date, time, title, done }, ...]
  toggleDone,        // (id) -> void
  removeEvent        // (id) -> void
} from '../utils/events.js';

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
function escapeHTML(s){ return String(s||'').replace(/[&<>"']/g, m=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'
}[m])); }
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
              <!-- Full-width header; order = Hebrew day (left) | counter (center) | numeric date (right) -->
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
    // Use the same wrapper/classes as Day so styling matches 1:1
    slot.innerHTML = `
      <section class="p-dayview" role="region" aria-label="רשימת משימות ליום">
        <div class="p-tasklist">
          ${items.map(taskCardHTML).join('')}
        </div>
      </section>
    `;
  }

  // update the expanding height smoothly
  const detail = row.querySelector('.w-detail');
  detail.style.maxHeight = slot.scrollHeight + 12 + 'px';
}

/* ---------- interactions ---------- */
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
    const closeRow = () => {
      row.classList.remove('is-open');
      head.setAttribute('aria-expanded', 'false');
      detail.hidden = true;
      slot.innerHTML = '';
      detail.style.maxHeight = '0px';
    };
    const toggleRow = () => (row.classList.contains('is-open') ? closeRow() : openRow());

    // open/close
    head.addEventListener('click', toggleRow);
    head.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRow(); }
    });

    // delegation inside the row
    row.addEventListener('click', (e) => {
      const target = e.target;
      const card  = target.closest('[data-task]');
      const okBtn = target.closest('.p-act--ok');
      const noBtn = target.closest('.p-act--no');

      if ((okBtn || noBtn) && card) {
        const id = card.dataset.id;
        if (!id) return;

        if (noBtn) removeEvent(id);
        if (okBtn) toggleDone(id);

        renderDetailInto(row);
        row.querySelector('.w-count').textContent = String(getEventsByDate(k).length);
        document.dispatchEvent(new Event(EVENTS_CHANGED));
        return;
      }

      if (card) {
        // Navigate to Day view for this date (home.js listens to this)
        document.dispatchEvent(new CustomEvent('go-day', { detail: k }));
      }
    });
  });
}

/* ---------- lifecycle ---------- */
export function mount(root) {
  document.body.setAttribute('data-view', 'week');
  const host = ensureHost(root);
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
