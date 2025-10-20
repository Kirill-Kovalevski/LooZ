// /src/pages/month.js
// Month view that renders INSIDE #viewRoot (no local prev/next buttons).
// Uses global 'period-nav' from the shell to move months.
// - Counter pill shows number of events per day (blue gradient; hue configurable via localStorage.pillHue).
// - Today's day is outlined in tomato red (not blue).
// - Clicking a date opens that day's Day view.
// - Seasonal pastel background hues are pushed to CSS custom properties on month change.

const HEB_DAYS = ['א','ב','ג','ד','ה','ו','ש'];
const HEB_MONTHS = [
  'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
  'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'
];

const EVENTS_CHANGED = 'events-changed';

let anchor = new Date();                 // which month is shown
let counts = new Map();                  // dateKey -> number
const TODAY_KEY = keyOf(new Date());

// ----------------- seasonal hues (for your pastel body/calendar bg) -----------------
/** Return a 5-color pastel palette for a given month (0=Jan..11=Dec). */
function seasonalPaletteForMonth(m) {
  const SPRING = [
    'hsl(150 60% 84%)', // mint
    'hsl(205 85% 86%)', // sky
    'hsl(265 70% 88%)', // lilac
    'hsl(35  95% 87%)', // peach
    'hsl(355 70% 86%)', // coral
  ];
  const SUMMER = [
    'hsl(45  95% 86%)', // sunshine
    'hsl(16  85% 85%)', // warm coral
    'hsl(195 80% 84%)', // aqua
    'hsl(265 65% 88%)', // lavender
    'hsl(110 45% 85%)', // soft sage
  ];
  const FALL = [
    'hsl(36  90% 84%)', // amber
    'hsl(16  75% 84%)', // pumpkin
    'hsl(220 60% 86%)', // dusk blue
    'hsl(300 35% 86%)', // plum mist
    'hsl(110 40% 84%)', // olive-sage
  ];
  const WINTER = [
    'hsl(210 80% 86%)', // ice blue
    'hsl(265 70% 88%)', // lilac frost
    'hsl(195 75% 86%)', // glacial aqua
    'hsl(330 45% 88%)', // pink dusk
    'hsl(230 55% 86%)', // night sky
  ];
  if (m === 11 || m === 0 || m === 1) return WINTER;      // Dec–Feb
  if (m >= 2  && m <= 4)            return SPRING;        // Mar–May
  if (m >= 5  && m <= 7)            return SUMMER;        // Jun–Aug
  return FALL;                                               // Sep–Nov
}

/** Push the palette into CSS custom properties used by your SCSS. */
function setSeasonTheme(dateLike) {
  const pal = seasonalPaletteForMonth(new Date(dateLike).getMonth());
  const r = document.documentElement.style;
  r.setProperty('--s1', pal[0]);
  r.setProperty('--s2', pal[1]);
  r.setProperty('--s3', pal[2]);
  r.setProperty('--s4', pal[3]);
  r.setProperty('--s5', pal[4]);
}

// ----------------- helpers -----------------
function pad2(n){ return String(n).padStart(2,'0'); }
function keyOf(d){
  const dt = (d instanceof Date) ? d : new Date(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())}`;
}

function parseToKey(val){
  if (!val) return null;
  if (val instanceof Date) return keyOf(val);
  if (typeof val === 'string') {
    const s = val.trim().replace(/\//g,'-');
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(val);
    if (!Number.isNaN(+d)) return keyOf(d);
  }
  return null;
}

/** Robust counter: supports common shapes used in dev (date|dateKey|startDate). */
function deriveCountsFromStorage(){
  const m = new Map();
  const bump = (k) => { if (k) m.set(k, (m.get(k)||0)+1); };

  // canonical
  try {
    const arr = JSON.parse(localStorage.getItem('events') || '[]');
    if (Array.isArray(arr)) {
      for (const e of arr) bump(parseToKey(e?.dateKey ?? e?.date ?? e?.startDate));
    }
  } catch {}

  // common alternates
  const ALT_KEYS = ['tasks','todos','items','activities'];
  for (const key of ALT_KEYS) {
    try {
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(arr)) {
        for (const t of arr) bump(parseToKey(t?.dateKey ?? t?.date ?? t?.d ?? t?.start));
      }
    } catch {}
  }

  return m;
}

/** Build a 6x7 grid, Sunday-first, with nulls for empty cells. */
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
  return Number.isFinite(v) ? v : 220; // blue default
}

// ----------------- rendering -----------------
function renderCell(d){
  if (!d) return `<div class="p-cell p-cell--dim" aria-hidden="true"></div>`;

  const dk        = keyOf(d);
  const isToday   = (dk === TODAY_KEY);
  const cnt       = counts.get(dk) || 0;
  const hasTasks  = cnt > 0;

  // Pill sits above the number; we keep spacing via CSS so it never touches the cell edge
  return `
    <button class="p-cell${isToday ? ' p-cell--today' : ''}"
            data-date="${dk}" role="gridcell"
            aria-label="יום ${d.getDate()} — ${cnt} משימות">
      <span class="p-count${hasTasks ? ' has':''}"
            style="--pill-hue:${getPillHue()}"
            aria-hidden="false">${cnt}</span>
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

// ----------------- lifecycle -----------------
export function mount(root){
  document.body.setAttribute('data-view','month');
  const host = ensureHost(root);

  // initialize seasonal hues for the current month before first paint
  setSeasonTheme(anchor);
  render(host);

  const onPeriod = (e) => {
    const dir = e.detail; // 'prev' | 'next' | 'today'
    const y = anchor.getFullYear(), m = anchor.getMonth();
    if (dir === 'prev')  anchor = new Date(y, m-1, 1);
    if (dir === 'next')  anchor = new Date(y, m+1, 1);
    if (dir === 'today') anchor = new Date();
    setSeasonTheme(anchor);   // update pastel splash hues for the new month
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
