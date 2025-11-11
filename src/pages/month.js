// /src/pages/month.js
// Month view — watercolor calendar, RTL, fixed 6-row height

import {
  _getAllActive,
  _getAllDone,
  _getAllRemoved,
  keyOf as eventKeyOf,
  EVENTS_CHANGED,
} from '../utils/events.js';

// weather
import {
  getDailyWeather,
  weatherCodeToKind
} from '../services/weather.service.js';

const HEB_DAYS   = ['א','ב','ג','ד','ה','ו','ש'];
const HEB_MONTHS = [
  'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
  'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'
];
const TODAY_KEY = eventKeyOf(new Date());

let anchor = new Date();
let counts = new Map();
let weatherByDate = {}; // yyyy-mm-dd -> {code, rainProb, tMax, tMin}
let weatherOn = false;  // current UI preference

/* ---------- weather pref helpers ---------- */
function readWeatherPref() {
  const on =
    localStorage.getItem('weatherEnabled') === '1' ||
    localStorage.getItem('weatherOn')      === '1' ||
    localStorage.getItem('showWeather')    === '1' ||
    localStorage.getItem('monthWeather')   === '1';
  return on;
}

/* palettes per month */
function themeForMonth(m) {
  switch (m) {
    case 0:  return { wash: ['#D8E9F5', '#C2D6EA', '#F4F7FB', '#009FB7'], strokes: ['rgba(0,159,183,.45)', 'rgba(231,243,255,.50)', 'rgba(125,154,196,.35)'] };
    case 1:  return { wash: ['#E2D5FF', '#C9BAF3', '#F6F3FF', '#654597'], strokes: ['rgba(101,69,151,.38)', 'rgba(239,214,255,.55)', 'rgba(116,107,192,.25)'] };
    case 2:  return { wash: ['#F6EFC6', '#E9F6E5', '#FFFFFF', '#74BC75'], strokes: ['rgba(116,188,117,.38)', 'rgba(248,202,145,.35)', 'rgba(211,234,212,.55)'] };
    case 3:  return { wash: ['#FFE8D4', '#FBD9CF', '#FFF9F5', '#FE4A49'], strokes: ['rgba(254,74,73,.35)', 'rgba(255,206,177,.45)', 'rgba(255,165,146,.25)'] };
    case 4:  return { wash: ['#E9D985', '#D4E6A3', '#FEFFF3', '#749C75'], strokes: ['rgba(248,209,120,.42)', 'rgba(116,156,117,.35)', 'rgba(220,239,188,.45)'] };
    case 5:  return { wash: ['#FFE3B4', '#FDE9C6', '#FFF6EA', '#FED766'], strokes: ['rgba(254,215,102,.44)', 'rgba(255,158,118,.32)', 'rgba(255,246,233,.40)'] };
    case 6:  return { wash: ['#D3F0F5', '#BCE3F2', '#F4FCFF', '#00A0B7'], strokes: ['rgba(0,160,183,.45)', 'rgba(211,240,245,.50)', 'rgba(94,188,199,.32)'] };
    case 7:  return { wash: ['#FFE1C4', '#FFD0C4', '#FFF7F2', '#FCBA04'], strokes: ['rgba(252,186,4,.42)', 'rgba(255,177,153,.42)', 'rgba(249,128,130,.22)'] };
    case 8:  return { wash: ['#F0DDD4', '#E8D0C8', '#FFF7F4', '#E9A885'], strokes: ['rgba(233,168,133,.46)', 'rgba(240,199,180,.35)', 'rgba(175,141,117,.30)'] };
    case 9:  return { wash: ['#F9DCC4', '#F8E1CF', '#FFF8F1', '#C7685B'], strokes: ['rgba(199,104,91,.40)', 'rgba(248,216,186,.42)', 'rgba(246,166,138,.32)'] };
    case 10: return { wash: ['#FFE6D6', '#F6DBD1', '#FFF9F5', '#F58B7A'], strokes: ['rgba(245,139,122,.40)', 'rgba(255,216,195,.38)', 'rgba(186,166,143,.20)'] };
    case 11: return { wash: ['#CEE5F2', '#ACCBE1', '#F4F8FC', '#5D4A66'], strokes: ['rgba(93,74,102,.34)', 'rgba(177,207,231,.48)', 'rgba(119,143,174,.30)'] };
    default: return { wash: ['#F4F4F4', '#ECECEC', '#FFFFFF', '#999'], strokes: ['rgba(153,153,153,.35)', 'rgba(230,230,230,.45)', 'rgba(200,200,200,.25)'] };
  }
}

function setMonthCSSVars(dateLike) {
  const d = new Date(dateLike);
  const th = themeForMonth(d.getMonth());
  const r = document.documentElement.style;
  r.setProperty('--m-top',    th.wash[0]);
  r.setProperty('--m-mid',    th.wash[1]);
  r.setProperty('--m-bot',    th.wash[2]);
  r.setProperty('--m-accent', th.wash[3]);
  r.setProperty('--m-stroke1', th.strokes[0]);
  r.setProperty('--m-stroke2', th.strokes[1]);
  r.setProperty('--m-stroke3', th.strokes[2]);
}

/* ---------- helpers ---------- */
function pad2(n) { return String(n).padStart(2, '0'); }
function keyOf(d) {
  const dt = (d instanceof Date) ? d : new Date(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}
function monthTitle(d) { return `${HEB_MONTHS[d.getMonth()]} ${d.getFullYear()}`; }

/* always 6 rows → 42 cells */
function buildMonthCells(base) {
  const y = base.getFullYear();
  const m = base.getMonth();
  const first = new Date(y, m, 1);
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const lead = first.getDay(); // 0 = Sun

  const cells = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));

  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);

  return cells;
}

/* counts */
function deriveCountsFromEventsStore() {
  const m = new Map();
  const bump = (k) => { if (k) m.set(k, (m.get(k) || 0) + 1); };

  const active = _getAllActive();
  for (const e of active) bump(e.date || eventKeyOf(e.date || Date.now()));

  const done = _getAllDone();
  for (const e of done) bump(e.date || eventKeyOf(e.completedAt || e.date || Date.now()));

  const removed = _getAllRemoved();
  for (const e of removed) bump(e.date || eventKeyOf(e.removedAt || e.date || Date.now()));

  return m;
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

/* ---------- weather SVGs ---------- */
function weatherSVG(kind) {
  const baseCloud = `
    <path
      d="M10 19h12.5c2.6 0 4.5-1.8 4.5-4.2 0-2.2-1.5-3.9-3.7-4.1-.4-3-2.8-5.2-5.9-5.2-2.7 0-5 1.7-5.7 4.1C9 9.7 7 11.3 7 13.7 7 16 8.7 19 10 19z"
      fill="#E6EDF5"
      stroke="#D3DFEB"
      stroke-width="0.8"
    />`;

  switch (kind) {
    case 'sun':
      return `
        <div class="p-weather p-weather--sun" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="4.5" fill="#FFD166" />
            <g stroke="#FFD166" stroke-width="1.2" stroke-linecap="round">
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2"  y1="12" x2="5"  y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
              <line x1="4.7" y1="4.7" x2="6.5" y2="6.5" />
              <line x1="17.5" y1="17.5" x2="19.3" y2="19.3" />
              <line x1="4.7" y1="19.3" x2="6.5" y2="17.5" />
              <line x1="17.5" y1="6.5" x2="19.3" y2="4.7" />
            </g>
          </svg>
        </div>`;
    case 'partly':
      return `
        <div class="p-weather p-weather--partly" aria-hidden="true">
          <svg viewBox="0 0 32 24">
            <circle cx="11" cy="9" r="4" fill="#FFD166" />
            ${baseCloud}
          </svg>
        </div>`;
    case 'cloud':
      return `
        <div class="p-weather p-weather--cloud" aria-hidden="true">
          <svg viewBox="0 0 32 24">
            ${baseCloud}
          </svg>
        </div>`;
    case 'rain':
      return `
        <div class="p-weather p-weather--rain" aria-hidden="true">
          <svg viewBox="0 0 32 28">
            ${baseCloud}
            <line x1="13" y1="18.5" x2="13" y2="23"   stroke="#4A93FF" stroke-width="1.3" stroke-linecap="round" />
            <line x1="18" y1="18.5" x2="18" y2="23.5" stroke="#4A93FF" stroke-width="1.3" stroke-linecap="round" />
          </svg>
        </div>`;
    case 'rain-heavy':
      return `
        <div class="p-weather p-weather--rainheavy" aria-hidden="true">
          <svg viewBox="0 0 32 30">
            ${baseCloud}
            <line x1="12" y1="18.5" x2="12" y2="24" stroke="#337BFF" stroke-width="1.3" stroke-linecap="round" />
            <line x1="16" y1="18.5" x2="16" y2="24" stroke="#337BFF" stroke-width="1.3" stroke-linecap="round" />
            <line x1="20" y1="18.5" x2="20" y2="24" stroke="#337BFF" stroke-width="1.3" stroke-linecap="round" />
          </svg>
        </div>`;
    case 'thunder':
      return `
        <div class="p-weather p-weather--thunder" aria-hidden="true">
          <svg viewBox="0 0 32 30">
            ${baseCloud}
            <path d="M15 18.5l-2 4.5h2.2L14 28l4-5h-2.2l2.2-4.5h-3z" fill="#FFB703" stroke="#E59A00" stroke-width="0.4" />
          </svg>
        </div>`;
    case 'snow':
      return `
        <div class="p-weather p-weather--snow" aria-hidden="true">
          <svg viewBox="0 0 32 30">
            ${baseCloud}
            <circle cx="13" cy="21"   r="1.1" fill="#C5D9FF" />
            <circle cx="18" cy="22.5" r="1.1" fill="#C5D9FF" />
          </svg>
        </div>`;
    case 'sleet':
      return `
        <div class="p-weather p-weather--sleet" aria-hidden="true">
          <svg viewBox="0 0 32 30">
            ${baseCloud}
            <line x1="13" y1="18.5" x2="13" y2="23" stroke="#4A93FF" stroke-width="1.2" stroke-linecap="round" />
            <circle cx="18" cy="22" r="1.1" fill="#C5D9FF" />
          </svg>
        </div>`;
    default: return '';
  }
}

/* ---------- rendering ---------- */
function renderCell(d) {
  if (!d) {
    return `<div class="p-cell p-cell--dim" aria-hidden="true"></div>`;
  }

  const dk = keyOf(d);
  const isToday = dk === TODAY_KEY;
  const cnt = counts.get(dk) || 0;

  const w = weatherByDate[dk];
  const kind = w ? weatherCodeToKind(w.code, w.rainProb) : null;
  const tMax = w?.tMax;

  const weatherBlock = weatherOn
    ? (kind
        ? weatherSVG(kind)
        : `<div class="p-weather p-weather--empty" aria-hidden="true"></div>`)
    : '';

  const tempBlock = weatherOn && typeof tMax === 'number'
    ? `<span class="p-temp">${Math.round(tMax)}°</span>`
    : '';

  return `
    <button class="p-cell${isToday ? ' p-cell--today' : ''}${weatherOn ? ' p-cell--weather' : ''}"
            data-date="${dk}"
            role="gridcell"
            aria-label="יום ${d.getDate()} - ${cnt} משימות">
      ${weatherBlock}
      ${tempBlock}
      <span class="p-cell__num">${d.getDate()}</span>
      <span class="p-count${cnt > 0 ? ' has' : ''}">${cnt}</span>
    </button>
  `;
}

function render(host) {
  counts = deriveCountsFromEventsStore();
  const cells = buildMonthCells(anchor);

  host.innerHTML = `
    <section class="p-monthwrap" aria-label="תצוגת חודש">
      <div class="p-monthcard">
        <header class="p-monthhead">
          <div class="p-monthtitle">${monthTitle(anchor)}</div>
        </header>

        <div class="p-weekbar" aria-hidden="true">
          ${HEB_DAYS.map(d => `<span class="p-wday">${d}</span>`).join('')}
        </div>

        <div class="p-monthgrid" role="grid">
          ${cells.map(renderCell).join('')}
        </div>
      </div>
      <div class="p-bottompad" aria-hidden="true"></div>
    </section>
  `;

  host.querySelector('.p-monthgrid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.p-cell[data-date]');
    if (!btn) return;
    const dk = btn.getAttribute('data-date');
    if (!dk) return;
    // this goes to home.js → day view, and day view shows that date
    localStorage.setItem('selectedDate', dk);
    document.dispatchEvent(new CustomEvent('go-day', { detail: dk }));
  });
}

async function fetchWeatherAndRender(host) {
  try {
    const data = await getDailyWeather();
    weatherByDate = data || {};
    render(host);
  } catch (err) {
    console.warn('weather fetch failed', err);
    render(host);
  }
}

/* ---------- lifecycle ---------- */
export function mount(root) {
  document.body.setAttribute('data-view', 'month');
  const host = ensureHost(root);

  setMonthCSSVars(anchor);

  weatherOn = readWeatherPref();

  if (weatherOn) {
    render(host);
    fetchWeatherAndRender(host);
  } else {
    weatherByDate = {};
    render(host);
  }

  const onPeriod = (e) => {
    const dir = e.detail;
    const y = anchor.getFullYear();
    const m = anchor.getMonth();
    if (dir === 'prev')  anchor = new Date(y, m - 1, 1);
    if (dir === 'next')  anchor = new Date(y, m + 1, 1);
    if (dir === 'today') anchor = new Date();
    setMonthCSSVars(anchor);

    if (weatherOn) {
      render(host);
      fetchWeatherAndRender(host);
    } else {
      render(host);
    }
  };

  const onEvents = () => render(host);

  const onWeatherPref = (e) => {
    weatherOn = !!e.detail?.enabled;
    if (weatherOn) {
      render(host);
      fetchWeatherAndRender(host);
    } else {
      weatherByDate = {};
      render(host);
    }
  };

  mount._cleanup?.();
  document.addEventListener('period-nav', onPeriod);
  document.addEventListener(EVENTS_CHANGED, onEvents);
  document.addEventListener('weather-pref-changed', onWeatherPref);

  mount._cleanup = () => {
    document.removeEventListener('period-nav', onPeriod);
    document.removeEventListener(EVENTS_CHANGED, onEvents);
    document.removeEventListener('weather-pref-changed', onWeatherPref);
  };
}

export default { mount };
