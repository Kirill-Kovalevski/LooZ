// Month view that renders INSIDE #viewRoot (no local prev/next buttons).
// Uses global period-nav from the shell to move months.

const HEB_DAYS = ['א','ב','ג','ד','ה','ו','ש'];
const HEB_MONTHS = [
  'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
  'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'
];

const EVENTS_CHANGED  = 'events-changed';
const TODAY_KEY       = keyOf(new Date());
let   anchor          = new Date();   // which month is shown
let   counts          = new Map();    // dateKey -> number

/* ------------ small helpers ------------ */
function keyOf(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const da= String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${da}`;
}
function parseToKey(val){
  // Accept "YYYY-MM-DD", "YYYY/MM/DD", ISO strings, or Date objects
  if (!val) return null;
  if (val instanceof Date) return keyOf(val);
  if (typeof val === 'string') {
    // normalize separators
    const s = val.trim().replace(/\//g,'-');
    // fast path YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(val);
    if (!Number.isNaN(+d)) return keyOf(d);
  }
  return null;
}

/** Robust counter that tries several common storage shapes */
function deriveCountsFromStorage(){
  const m = new Map();
  const add = (k) => { if (!k) return; m.set(k, (m.get(k)||0)+1); };

  // 1) Our canonical events array (if present)
  try {
    const arr = JSON.parse(localStorage.getItem('events') || '[]');
    if (Array.isArray(arr)) {
      for (const e of arr) add(parseToKey(e?.dateKey ?? e?.date ?? e?.startDate));
    }
  } catch {}

  // 2) Other likely places dev versions often used
  const CANDIDATE_KEYS = ['tasks', 'todos', 'items', 'activities'];
  for (const k of CANDIDATE_KEYS) {
    try {
      const arr = JSON.parse(localStorage.getItem(k) || '[]');
      if (Array.isArray(arr)) {
        for (const t of arr) add(parseToKey(t?.dateKey ?? t?.date ?? t?.d ?? t?.start));
      }
    } catch {}
  }

  // 3) If nothing found, return empty map (UI will show 0s)
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
function monthTitle(d){ return `${HEB_MONTHS[d.getMonth()]} ${d.getFullYear()}`; }

function ensureHost(root){
  let host = document.getElementById('viewRoot') || root.querySelector('#viewRoot');
  if (!host){
    host = document.createElement('section');
    host.id = 'viewRoot';
    root.appendChild(host);
  }
  return host;
}

/* Read pill hue (for blue gradient by default; user can change later) */
function getPillHue(){
  const v = Number(localStorage.getItem('pillHue'));
  return Number.isFinite(v) ? v : 220; // blue
}

function renderCell(d){
  if (!d) return `<div class="p-cell p-cell--dim" aria-hidden="true"></div>`;
  const k        = keyOf(d);
  const isToday  = (k === TODAY_KEY);
  const cnt      = counts.get(k) || 0;
  const hasTasks = cnt > 0;

  // pill hue is set inline so CSS can read it
  return `
    <button class="p-cell${isToday ? ' p-cell--today' : ''}"
            data-date="${k}" role="gridcell"
            aria-label="יום ${d.getDate()} — ${cnt} משימות">
      <span class="p-count${hasTasks ? ' has':''}"
            style="--pill-hue:${getPillHue()}" aria-hidden="false">${cnt}</span>
      <span class="p-cell__num">${d.getDate()}</span>
    </button>
  `;
}

function render(host){
  counts = deriveCountsFromStorage();
  const cells = buildMonthCells(anchor);

  host.innerHTML = `
    <section class="p-monthview" aria-label="לוח חודשי">
      <div class="p-monthhead">
        <div class="p-monthtitle">${monthTitle(anchor)}</div>
      </div>

      <div class="p-weekbar" aria-hidden="true">
        ${HEB_DAYS.map(d => `<span class="p-wday">${d}</span>`).join('')}
      </div>

      <div class="p-monthgrid" role="grid">
        ${cells.map(renderCell).join('')}
      </div>
    </section>
  `;

  // Click -> go to Day view for that date
  host.querySelector('.p-monthgrid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.p-cell[data-date]');
    if (!btn) return;
    const dk = btn.getAttribute('data-date');
    if (!dk) return;
    localStorage.setItem('selectedDate', dk);
    document.dispatchEvent(new CustomEvent('go-day', { detail: dk }));
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

  // cleanup on remount
  mount._cleanup?.();
  mount._cleanup = () => {
    document.removeEventListener('period-nav', onPeriod);
    document.removeEventListener(EVENTS_CHANGED, onEvents);
  };
}
