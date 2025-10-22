// /src/pages/week.js
// Week view — rows expand; ✓/✕ act by id; stays on page.

import {
  EVENTS_CHANGED, keyOf, getEventsByDate,
  completeEvent, trashEvent
} from '../utils/events.js';

import { fxConfetti, fxInkDelete, bumpTaskCounter } from '../utils/effects.js';

const HEB_DAYS = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const pad2 = n => String(n).padStart(2, '0');

function startOfWeekSun(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function buildWeek(anchor) {
  const a = startOfWeekSun(anchor);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(a.getFullYear(), a.getMonth(), a.getDate() + i)
  );
}

function ensureHost(root) {
  let host = document.getElementById('viewRoot') || root.querySelector('#viewRoot');
  if (!host) {
    host = document.createElement('section');
    host.id = 'viewRoot';
    root.appendChild(host);
  }
  return host;
}

const escapeHTML = s => String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[m]));
const cardHTML = (t) => `
  <article class="p-datask${t.done ? ' is-done' : ''}" data-task data-id="${t.id}">
    <div class="p-time" dir="ltr">${t.time || '—'}</div>
    <div class="p-body"><div class="p-title">${escapeHTML(t.title || 'ללא כותרת')}</div></div>
    <div class="p-actions">
      <button class="p-act p-act--ok" type="button" aria-label="בוצע">✓</button>
      <button class="p-act p-act--no" type="button" aria-label="מחק">✕</button>
    </div>
  </article>
`;

const state = { cursor: new Date(), cleanup: null };

function renderDetailInto(row) {
  const k     = row.dataset.date;
  const slot  = row.querySelector('[data-slot]');
  const items = getEventsByDate(k);

  slot.innerHTML = items.length
    ? `<section class="p-dayview" role="region">
         <div class="p-tasklist">${items.map(cardHTML).join('')}</div>
       </section>`
    : `<article class="p-empty">אין משימות ליום זה.</article>`;

  const detail = row.querySelector('.w-detail');
  detail.style.maxHeight = slot.scrollHeight + 12 + 'px';
}

function hookRow(host) {
  host.querySelectorAll('.w-dayrow').forEach((row) => {
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

    head.addEventListener('click', () => {
      if (row.classList.contains('is-open')) {
        document.dispatchEvent(new CustomEvent('go-day', { detail: k }));
      } else openRow();
    });

    // in-row delegation for ✓ / ✕ (stop nav flip)
    row.addEventListener('click', async (e) => {
      const card = e.target.closest('[data-task]');
      const ok   = e.target.closest('.p-act--ok');
      const no   = e.target.closest('.p-act--no');
      if (!card || (!ok && !no)) return;

      e.preventDefault(); e.stopPropagation();

      const id = card.getAttribute('data-id');
      if (!id) return;

      if (ok) {
        fxConfetti(e.clientX, e.clientY, { count: 36, ms: 1200 });
        card.classList.add('fx-done');
        bumpTaskCounter?.(-1);
        setTimeout(() => { completeEvent(id); }, 440);
      }
      if (no) {
        await fxInkDelete(card);
        bumpTaskCounter?.(-1);
        setTimeout(() => { trashEvent(id); }, 0);
      }
    });
  });
}

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
                <span class="w-left">${HEB_DAYS[idx]}</span>
                <span class="w-count">${cnt}</span>
                <span class="w-right" dir="ltr">${pad2(d.getDate())}.${pad2(d.getMonth()+1)}</span>
              </header>
              <div class="w-detail" hidden><div class="w-detail__slot" data-slot></div></div>
            </li>
          `;
        }).join('')}
      </ul>
    </section>
  `;
  hookRow(host);
}

export function mount(root) {
  document.body.setAttribute('data-view', 'week');
  const host = ensureHost(root);

  try {
    const sel = localStorage.getItem('selectedDate');
    if (sel) state.cursor = new Date(sel);
  } catch {}

  render(host);

  const onPeriod = e => {
    const dir = e.detail;
    if (dir === 'prev')  state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), state.cursor.getDate()-7);
    if (dir === 'next')  state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), state.cursor.getDate()+7);
    if (dir === 'today') state.cursor = new Date();
    render(host);
  };
  const onEvents = () => render(host);

  state.cleanup?.();
  document.addEventListener('period-nav', onPeriod);
  document.addEventListener(EVENTS_CHANGED, onEvents);
  state.cleanup = () => {
    document.removeEventListener('period-nav', onPeriod);
    document.removeEventListener(EVENTS_CHANGED, onEvents);
  };
}
