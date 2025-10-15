// src/pages/month.js
// Month view renders INSIDE #viewRoot (the shell stays put).

/* ---------------- small date helpers ---------------- */
function keyOf(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

// Build 6 rows x 7 columns (always 42 cells). Sunday-first.
function buildMonthCells(anchor) {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const first = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const lead = first.getDay(); // JS: 0=Sun..6=Sat (we want Sunday-first)
  const cells = Array(lead).fill(null); // leading blanks

  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null); // trailing blanks
  while (cells.length < 42) cells.push(null);       // force 6 rows

  return cells;
}

const HEB_WEEK_SUN = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
function weekStrip() {
  return `
    <div class="p-monthbar" aria-hidden="true">
      ${HEB_WEEK_SUN.map(d => `<span class="p-wday">${d}</span>`).join('')}
    </div>
  `;
}

/* ---------------- events store helpers ---------------- */
const STORE_KEY = 'events';              // your create-sheet should save here
const EVENTS_CHANGED = 'events-changed'; // fire this after saving an event

function readEvents() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
  catch { return []; }
}

function countByDate(events) {
  const m = new Map();
  for (const e of events) {
    // support either {dateKey:'YYYY-MM-DD'} or {date:'YYYY-MM-DD'}
    const k = e?.dateKey || e?.date;
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

/* ---------------- local state ---------------- */
let state = {
  cursor: new Date(),   // which month we show
  counts: new Map(),
  cleanup: null         // unsubscribe on unmount/remount
};

/* ---------------- rendering ---------------- */
function ensureHost(root) {
  let host = root.querySelector('#viewRoot');
  if (!host) {
    host = document.createElement('section');
    host.id = 'viewRoot';
    root.appendChild(host);
  }
  return host;
}

function renderCell(d, todayKey, counts) {
  if (!d) {
    // empty padding cell: keep structure; styling hides it
    return `<div class="p-cell p-cell--empty" aria-hidden="true"></div>`;
  }
  const k = keyOf(d);
  const isToday = (k === todayKey);
  const cnt = counts.get(k) || 0;

  return `
    <button class="p-cell${isToday ? ' p-cell--today' : ''}" data-date="${k}" role="gridcell">
      <span class="p-count" aria-label="מספר משימות">${cnt}</span>
      <span class="p-num" aria-label="תאריך">${d.getDate()}</span>
    </button>
  `;
}

function render(host) {
  const events = readEvents();
  state.counts = countByDate(events);

  const cells = buildMonthCells(state.cursor);
  const todayKey = keyOf(new Date());

  host.innerHTML = `
    <section class="p-monthwrap" aria-label="לוח חודשי">
      ${weekStrip()}
      <div class="p-monthgrid" role="grid">
        ${cells.map(d => renderCell(d, todayKey, state.counts)).join('')}
      </div>
    </section>
  `;
}

/* ---------------- public mount ---------------- */
export function mount(appRoot) {
  // scope styles for the month view only
  document.body.setAttribute('data-view', 'month');

  const host = ensureHost(appRoot);
  render(host);

  // period navigation (from the shell mini navbar)
  const onPeriod = (e) => {
    const dir = e.detail; // 'prev' | 'next' | 'today'
    const y = state.cursor.getFullYear();
    const m = state.cursor.getMonth();

    if (dir === 'prev')  state.cursor = new Date(y, m - 1, 1);
    if (dir === 'next')  state.cursor = new Date(y, m + 1, 1);
    if (dir === 'today') state.cursor = new Date();

    render(host);
  };

  // whenever events list changes (create/edit/delete), re-render
  const onEventsChanged = () => render(host);

  document.addEventListener('period-nav', onPeriod);
  document.addEventListener(EVENTS_CHANGED, onEventsChanged);

  // make sure we don’t duplicate listeners when switching views
  state.cleanup?.();
  state.cleanup = () => {
    document.removeEventListener('period-nav', onPeriod);
    document.removeEventListener(EVENTS_CHANGED, onEventsChanged);
  };

  // optional: delegate clicks on a day to open a day view later
  host.querySelector('.p-monthgrid')?.addEventListener('click', (e) => {
    const cell = e.target.closest('.p-cell');
    if (!cell) return;
    // Example: store selected date and let the shell switch to day view.
    // localStorage.setItem('selectedDate', cell.dataset.date);
    // document.dispatchEvent(new CustomEvent('switch-view', { detail: 'day' }));
  });
}
