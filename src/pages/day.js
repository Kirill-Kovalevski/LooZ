// /src/pages/day.js
// Renders the Day view into #viewRoot and manages the task list for a single date.

const STORE = 'events';                   // [{date:"YYYY-MM-DD", time:"HH:MM", title:"...", done:false}]
const EVENTS_CHANGED = 'events-changed';  // dispatch when localStorage list changes

const HEB_DAYS = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];

/* ---------- helpers ---------- */
function pad2(n){ return String(n).padStart(2,'0'); }
export function keyOf(d){
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function dayParts(d){
  const dow = HEB_DAYS[d.getDay()];
  const md  = `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}`;
  return { dow, md };
}
function readStore(){
  try { return JSON.parse(localStorage.getItem(STORE) || '[]'); }
  catch { return []; }
}
function saveStore(list){
  localStorage.setItem(STORE, JSON.stringify(list));
  document.dispatchEvent(new Event(EVENTS_CHANGED));
}
function ensureHost(root){
  let host = root.querySelector('#viewRoot') || document.getElementById('viewRoot');
  if(!host){
    host = document.createElement('section');
    host.id = 'viewRoot';
    root.appendChild(host);
  }
  return host;
}
function eventsFor(dateKey){
  const all = readStore();
  return all
    .filter(e => e.date === dateKey)
    .sort((a,b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
}
function escapeHTML(s){
  return String(s).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[m]);
}

/* ---------- local state ---------- */
let state = {
  date: new Date(), // defaults to today; updated by period-nav
  cleanup: null
};

/* ---------- view ---------- */
function taskCard(task, i){
  const time = task.time || '—';
  const done = task.done ? ' is-done' : '';
  return `
    <article class="p-datask${done}" data-idx="${i}">
      <div class="p-time" dir="ltr">${time}</div>
      <div class="p-body">
        <div class="p-title">${escapeHTML(task.title || 'ללא כותרת')}</div>
      </div>
      <div class="p-actions">
        <button class="p-act p-act--ok" aria-label="בוצע" title="בוצע">✓</button>
        <button class="p-act p-act--no" aria-label="מחק"  title="מחק">✕</button>
      </div>
    </article>
  `;
}
function emptyCard(){
  return `
    <article class="p-empty">
      אין משימות להיום. לחץ על הכפתור למטה כדי ליצור משימה חדשה.
    </article>
  `;
}

function render(host){
  const dateKey = keyOf(state.date);
  const list = eventsFor(dateKey);
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

  // ✓ toggle done
  host.querySelectorAll('.p-act--ok').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = +btn.closest('.p-datask').dataset.idx;
      const dayList = eventsFor(dateKey);
      const task = dayList[idx];
      if(!task) return;

      // flip done and persist back into full list
      const all = readStore();
      const pos = all.findIndex(x => x.date===task.date && x.time===task.time && x.title===task.title);
      if(pos > -1){
        all[pos] = { ...all[pos], done: !all[pos].done };
        saveStore(all);
        render(host);
      }
    });
  });

  // ✕ delete
  host.querySelectorAll('.p-act--no').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = +btn.closest('.p-datask').dataset.idx;
      const item = eventsFor(dateKey)[idx];
      if(!item) return;

      let all = readStore();
      all = all.filter(x => !(x.date===item.date && x.time===item.time && x.title===item.title));
      saveStore(all);
      render(host);
    });
  });
}

/* ---------- public mount ---------- */
export function mount(root){
  document.body.setAttribute('data-view','day');
  const host = ensureHost(root);

  // If another view set a selected date, honor it
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
