// Month view that renders INSIDE #viewRoot (no navigation).

const HEB_DAYS = ['א','ב','ג','ד','ה','ו','ש'];
const HEB_MONTHS = [
  'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
  'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'
];

const STORE_KEY = 'events';       // [{ dateKey:'YYYY-MM-DD', ... }]
const EVENTS_CHANGED = 'events-changed';

let anchor = new Date();          // which month we’re showing
let counts = new Map();

function keyOf(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const da= String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${da}`;
}
const TODAY_KEY = keyOf(new Date());

function readEvents(){
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
  catch { return []; }
}
function countByDate(list){
  const m = new Map();
  for (const e of list) if (e?.dateKey) m.set(e.dateKey, (m.get(e.dateKey)||0)+1);
  return m;
}

/* Build a 6x7 grid, Sunday-first, with nulls for empty cells */
function buildMonthCells(base){
  const y = base.getFullYear(), m = base.getMonth();
  const first = new Date(y, m, 1);
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const lead = first.getDay(); // 0=Sun..6=Sat
  const cells = Array(lead).fill(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(new Date(y,m,d));
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);
  return cells;
}

function monthTitle(d){
  return `${HEB_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function ensureHost(root){
  let host = document.getElementById('viewRoot') || root.querySelector('#viewRoot');
  if (!host){
    host = document.createElement('section');
    host.id = 'viewRoot';
    root.appendChild(host);
  }
  return host;
}

function renderCell(d){
  if (!d) return `<div class="p-cell p-cell--dim" aria-hidden="true"></div>`;
  const k = keyOf(d);
  const isToday = (k === TODAY_KEY);
  const cnt = counts.get(k) || 0;

  return `
    <button class="p-cell${isToday ? ' p-cell--today' : ''}" data-date="${k}" role="gridcell">
      <span class="p-count" aria-label="מספר משימות">${cnt}</span>
      <span class="p-cell__num">${d.getDate()}</span>
    </button>
  `;
}

function render(host){
  counts = countByDate(readEvents());
  const cells = buildMonthCells(anchor);

  host.innerHTML = `
    <section class="p-monthview" aria-label="לוח חודשי">
      <div class="p-monthhead">
        <button class="p-navbtn" data-prev aria-label="קודם">‹</button>
        <div class="p-monthtitle">${monthTitle(anchor)}</div>
        <button class="p-navbtn" data-next aria-label="הבא">›</button>
      </div>

      <div class="p-weekbar" aria-hidden="true">
        ${HEB_DAYS.map(d => `<span class="p-wday">${d}</span>`).join('')}
      </div>

      <div class="p-monthgrid" role="grid">
        ${cells.map(renderCell).join('')}
      </div>
    </section>
  `;

  // Local prev/next wiring that simply re-dispatches your global event.
  host.querySelector('[data-prev]')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('period-nav', { detail:'prev' }));
  });
  host.querySelector('[data-next]')?.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('period-nav', { detail:'next' }));
  });
}

export function mount(root){
  document.body.setAttribute('data-view','month');
  const host = ensureHost(root);
  render(host);

  const onPeriod = (e) => {
    const dir = e.detail;
    const y = anchor.getFullYear(), m = anchor.getMonth();
    if (dir === 'prev')  anchor = new Date(y, m-1, 1);
    if (dir === 'next')  anchor = new Date(y, m+1, 1);
    if (dir === 'today') anchor = new Date();
    render(host);
  };
  const onEvents = () => render(host);

  document.addEventListener('period-nav', onPeriod);
  document.addEventListener(EVENTS_CHANGED, onEvents);

  // Ensure we clean up if this view is remounted later
  mount._cleanup?.();
  mount._cleanup = () => {
    document.removeEventListener('period-nav', onPeriod);
    document.removeEventListener(EVENTS_CHANGED, onEvents);
  };
}
