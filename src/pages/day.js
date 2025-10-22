// /src/pages/day.js
// Day view — acts only on the item by id, archives via utils/events.

import {
  EVENTS_CHANGED, keyOf, getEventsByDate,
  completeEvent, trashEvent
} from '../utils/events.js';

import { fxConfetti, fxInkDelete, bumpTaskCounter } from '../utils/effects.js';

const HEB_DAYS = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const pad2 = n => String(n).padStart(2,'0');
const dayParts = d => ({ dow: HEB_DAYS[d.getDay()], md:  `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}` });

const escapeHTML = s => String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));

function ensureHost(root){
  let host = root.querySelector('#viewRoot') || document.getElementById('viewRoot');
  if(!host){ host = document.createElement('section'); host.id = 'viewRoot'; root.appendChild(host); }
  return host;
}

let state = { date: new Date(), cleanup: null };

const cardHTML = (t) => `
  <article class="p-datask" data-task data-id="${t.id}">
    <div class="p-time" dir="ltr">${t.time || '—'}</div>
    <div class="p-body"><div class="p-title">${escapeHTML(t.title || 'ללא כותרת')}</div></div>
    <div class="p-actions">
      <button class="p-act p-act--ok" type="button" aria-label="בוצע">✓</button>
      <button class="p-act p-act--no" type="button" aria-label="מחק">✕</button>
    </div>
  </article>
`;
const emptyHTML = `<article class="p-empty">אין משימות להיום. לחץ על הכפתור למטה כדי ליצור משימה חדשה.</article>`;

function render(host){
  const dateKey   = keyOf(state.date);
  const items     = getEventsByDate(dateKey);
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
        ${items.length ? items.map(cardHTML).join('') : emptyHTML}
      </div>
    </section>
  `;

  // delegation for ✓ / ✕ (stop nav flip)
  host.addEventListener('click', async (e) => {
    const ok   = e.target.closest('.p-act--ok');
    const del  = e.target.closest('.p-act--no');
    const card = e.target.closest('[data-task]');
    if (!card || (!ok && !del)) return;

    e.preventDefault(); e.stopPropagation();

    const id = card.getAttribute('data-id');
    if (!id) return;

    if (ok) {
      fxConfetti(e.clientX, e.clientY, { count: 36, ms: 1200 });
      card.classList.add('fx-done');
      bumpTaskCounter?.(-1);
      setTimeout(() => { completeEvent(id); }, 440);
      return;
    }

    if (del) {
      await fxInkDelete(card);
      bumpTaskCounter?.(-1);
      setTimeout(() => { trashEvent(id); }, 0);
    }
  });
}

/* ---------- lifecycle ---------- */
export function mount(root){
  document.body.setAttribute('data-view','day');
  const host = ensureHost(root);

  try {
    const sel = localStorage.getItem('selectedDate');
    if (sel) state.date = new Date(sel);
  } catch {}

  render(host);

  const onPeriod = (e)=>{
    const dir = e.detail;
    if (dir==='prev')  state.date = new Date(state.date.getFullYear(), state.date.getMonth(), state.date.getDate()-1);
    if (dir==='next')  state.date = new Date(state.date.getFullYear(), state.date.getMonth(), state.date.getDate()+1);
    if (dir==='today') state.date = new Date();
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
