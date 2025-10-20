// src/pages/day.js
// Day view – renders tasks for a single date into #viewRoot.
// Storage key: "events"  ->  [{date:"YYYY-MM-DD", time:"HH:MM", title:"...", done:false}]
// Emits:  'events-changed'  whenever we save, so other views can re-render.

const STORE = 'events';
const EVENTS_CHANGED = 'events-changed';
const HEB_DAYS = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];

const $ = (s, r = document) => r.querySelector(s);

function pad2(n){ return String(n).padStart(2,'0'); }
export function keyOf(d){
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}

function readStore(){
  try { return JSON.parse(localStorage.getItem(STORE) || '[]'); }
  catch { return []; }
}
function saveStore(list){
  localStorage.setItem(STORE, JSON.stringify(list));
  document.dispatchEvent(new Event(EVENTS_CHANGED));
}

function eventsFor(dateKey){
  return readStore()
    .filter(e => e.date === dateKey)
    .sort((a,b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
}

function hebDateString(d){
  const dayName = HEB_DAYS[d.getDay()];
  return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)} · ${dayName}`;
}

function ensureHost(root){
  // Day renders inside #viewRoot (created by home shell)
  let host = root.querySelector('#viewRoot') || $('#viewRoot');
  if (!host) {
    host = document.createElement('section');
    host.id = 'viewRoot';
    root.appendChild(host);
  }
  return host;
}

// ------------------------------------------------------------------
// STATE
// ------------------------------------------------------------------
let state = {
  date: new Date(),
  cleanup: null
};

// If a date was chosen elsewhere (month/week), honor it on mount
(function bootstrapSelectedDate(){
  try {
    const sel = localStorage.getItem('selectedDate');
    if (sel) {
      const d = new Date(sel);
      if (!Number.isNaN(+d)) state.date = d;
    }
  } catch {}
})();

// ------------------------------------------------------------------
// RENDER
// ------------------------------------------------------------------
function render(host){
  const dateKey = keyOf(state.date);
  const list = eventsFor(dateKey);

  host.innerHTML = `
    <section class="p-dayview" aria-label="רשימת משימות ליום">
      <header class="p-day-head">
        <div class="p-day-when">${hebDateString(state.date)}</div>
      </header>

      <div class="p-tasklist">
        ${list.length ? list.map(taskCard).join('') : emptyCard()}
      </div>
    </section>
  `;

  // toggle done
  host.querySelectorAll('.p-act--ok').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = +btn.closest('.p-datask').dataset.idx;
      const day = eventsFor(dateKey);
      const item = day[idx];
      if (!item) return;
      // mutate original array entry
      const all = readStore();
      const pos = all.findIndex(x => x.date===item.date && x.time===item.time && x.title===item.title);
      if (pos > -1) {
        all[pos] = { ...all[pos], done: !all[pos].done };
        saveStore(all);
        render(host);
      }
    });
  });

  // delete
  host.querySelectorAll('.p-act--no').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = +btn.closest('.p-datask').dataset.idx;
      const item = eventsFor(dateKey)[idx];
      if (!item) return;
      const all = readStore().filter(x => !(x.date===item.date && x.time===item.time && x.title===item.title));
      saveStore(all);
      render(host);
    });
  });
}

function taskCard(task, i){
  const time = (task.time || '—');
  const done = task.done ? ' is-done' : '';
  return `
    <article class="p-datask${done}" data-idx="${i}">
      <div class="p-time" dir="ltr">${time}</div>
      <div class="p-body">
        <div class="p-title">${escapeHTML(task.title || 'ללא כותרת')}</div>
      </div>
      <div class="p-actions">
        <button class="p-act p-act--ok" aria-label="בוצע">✓</button>
        <button class="p-act p-act--no" aria-label="מחק">✕</button>
      </div>
    </article>
  `;
}

function emptyCard(){
  return `
    <article class="p-empty">
      אין משימות להיום. לחצו על הכפתור הצף למטה כדי ליצור משימה חדשה.
    </article>
  `;
}

function escapeHTML(s){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

// ------------------------------------------------------------------
// PUBLIC MOUNT
// ------------------------------------------------------------------
export function mount(root){
  document.body.setAttribute('data-view','day');
  const host = ensureHost(root);

  // If “selectedDate” changed before entering Day view, sync once more
  try {
    const sel = localStorage.getItem('selectedDate');
    if (sel) {
      const d = new Date(sel);
      if (!Number.isNaN(+d)) state.date = d;
    }
  } catch {}

  render(host);

  const onPeriod = (e)=>{
    const dir = e.detail; // 'prev' | 'next' | 'today'
    if (dir === 'prev')  state.date = new Date(state.date.getFullYear(), state.date.getMonth(), state.date.getDate()-1);
    if (dir === 'next')  state.date = new Date(state.date.getFullYear(), state.date.getMonth(), state.date.getDate()+1);
    if (dir === 'today') state.date = new Date();
    // keep selectedDate in storage so the create modal defaults correctly
    localStorage.setItem('selectedDate', keyOf(state.date));
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
