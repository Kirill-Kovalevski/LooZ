// src/pages/day.js
// Render Day view INTO #viewRoot (no navigation)

const STORE = 'events'; // example: [{date:"2025-10-15", time:"16:30", title:"שיחה עם עדי", done:false}]
const EVENTS_CHANGED = 'events-changed';

const HEB_DAYS = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];

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
function ensureHost(root){
  let host = root.querySelector('#viewRoot') || document.getElementById('viewRoot');
  if(!host){
    host = document.createElement('section');
    host.id = 'viewRoot';
    root.appendChild(host);
  }
  return host;
}
function hebDateString(d){
  const dayName = HEB_DAYS[d.getDay()];
  return `${pad2(d.getDate())}.${pad2(d.getMonth()+1)} · ${dayName}`;
}
function eventsFor(dateKey){
  const all = readStore();
  return all.filter(e => e.date === dateKey)
            .sort((a,b) => (a.time||'00:00').localeCompare(b.time||'00:00'));
}

let state = {
  date: new Date(), // today by default
  cleanup: null
};

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

  // actions: ✓ / ✕
  host.querySelectorAll('.p-act--ok').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const idx = +btn.closest('.p-datask').dataset.idx;
      const all = readStore();
      const dayList = all.filter(x => x.date === dateKey)
                         .sort((a,b)=>(a.time||'').localeCompare(b.time||''));
      const task = dayList[idx];
      if(!task) return;
      task.done = !task.done;
      // write back into the original array: find by (date,time,title)
      const pos = all.findIndex(x => x.date===task.date && x.time===task.time && x.title===task.title);
      if(pos>-1){ all[pos]=task; saveStore(all); render(host); }
    });
  });

  host.querySelectorAll('.p-act--no').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = +btn.closest('.p-datask').dataset.idx;
      let all = readStore();
      const item = eventsFor(dateKey)[idx];
      if(!item) return;
      all = all.filter(x => !(x.date===item.date && x.time===item.time && x.title===item.title));
      saveStore(all);
      render(host);
    });
  });
}

function taskCard(task, i){
  const time = task.time || '—';
  const done = task.done ? ' is-done' : '';
  return `
    <article class="p-datask${done}" data-idx="${i}">
      <div class="p-time" dir="ltr">${time}</div>
      <div class="p-body">
        <div class="p-title">${escapeHTML(task.title||'ללא כותרת')}</div>
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
      אין משימות להיום. לחץ על הכפתור למטה כדי ליצור משימה חדשה.
    </article>
  `;
}
function escapeHTML(s){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

// Public mount
export function mount(root){
  document.body.setAttribute('data-view','day');
  const host = ensureHost(root);
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
