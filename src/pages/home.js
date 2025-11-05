// /src/pages/home.js
// NOTE: make sure vite.config.js has:  export default defineConfig({ base: '/LooZ/' })
import logoLight from '../icons/main-logo.png';
import logoDark  from '../icons/dark-logo.png';
import { openCreateModal } from '../components/create.js';  // create-event modal
import { initTaskFX } from '../utils/effects.js';

if (!window.__taskFxInit) {
  window.__taskFxInit = true;
  if (document.readyState !== 'loading') {
    initTaskFX(document);
  } else {
    document.addEventListener('DOMContentLoaded', () => initTaskFX(document), { once: true });
  }
}

// ---- tiny helpers ----
const HEB_DAYS = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const pad2     = n => String(n).padStart(2, '0');

function fromDateKey(key) {
  if (!key || typeof key !== 'string') return new Date();
  const [y, m, d] = key.split('-').map(v => parseInt(v, 10));
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

let headerCursor = new Date();
let currentView  = 'month'; // default boot view is 'month'

// IMPORTANT: static view map so Vite bundles them for GitHub Pages
const viewModules = import.meta.glob('./{day,week,month}.js');
// lazy pages (full-page routes)
const pageModules = import.meta.glob('./{settings,profile,social}.js');

// tick the header date shortly after local midnight
function startTodayTicker() {
  const now  = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
  const ms   = next.getTime() - now.getTime();
  setTimeout(() => {
    if (currentView !== 'day') {
      setHeaderDate(new Date());
    } else {
      const sel = localStorage.getItem('selectedDate');
      setHeaderDate(sel ? fromDateKey(sel) : new Date());
    }
    startTodayTicker();
  }, ms);
}

function getUserName() {
  const first = localStorage.getItem('firstName') || 'אורח';
  const last  = localStorage.getItem('lastName')  || '';
  return last ? `${first} ${last[0]}.` : first;
}

/* =========================
   Two-line header date (he-IL + Hebrew calendar)
   ========================= */
function setHeaderDate(d) {
  headerCursor = new Date(d);

  const gregLine = new Intl.DateTimeFormat('he-IL', {
    weekday: 'short', day: 'numeric', month: 'long'
  }).format(headerCursor);

  const heCal = new Intl.DateTimeFormat('he-IL-u-ca-hebrew', {
    day: 'numeric', month: 'long', year: 'numeric'
  }).formatToParts(headerCursor);

  const dayPart   = heCal.find(p => p.type === 'day');
  const monthPart = heCal.find(p => p.type === 'month');
  const yearPart  = heCal.find(p => p.type === 'year');

  const dayNum         = parseInt(dayPart?.value ?? '1', 10);
  const hebDayLetters  = toHebrewNumerals(dayNum);
  const yearNum        = parseInt(yearPart?.value ?? '5780', 10);
  const hebYearLetters = toHebrewYear(yearNum);

  const el = document.querySelector('.c-date');
  if (!el) return;

  el.innerHTML = `
    <div class="c-datewrap" dir="rtl" aria-live="polite">
      <div class="c-date__primary">${gregLine}</div>
      <div class="c-date__hebrew">${hebDayLetters} ב${monthPart?.value || ''} ${hebYearLetters}</div>
    </div>
  `;
}

// 1..31 → א׳ … ל״א
function toHebrewNumerals(num) {
  const table = [
    '', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט',
    'י', 'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט',
    'כ', 'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל', 'לא'
  ];
  const raw = table[num] || String(num);
  return insertGershayim(raw);
}
// 5786 → התשפ״ו
function toHebrewYear(yearNumber) {
  let result = '';
  let y = Number(yearNumber) || 0;
  if (y >= 5000) { result += 'ה'; y = y % 1000; }
  const hundreds = { 400: 'ת', 300: 'ש', 200: 'ר', 100: 'ק' };
  for (const h of [400, 300, 200, 100]) { while (y >= h) { result += hundreds[h]; y -= h; } }
  if (y === 15) return insertGershayim(result + 'טו');
  if (y === 16) return insertGershayim(result + 'טז');
  const tens = { 90:'צ',80:'פ',70:'ע',60:'ס',50:'נ',40:'מ',30:'ל',20:'כ',10:'י' };
  const ones = { 9:'ט',8:'ח',7:'ז',6:'ו',5:'ה',4:'ד',3:'ג',2:'ב',1:'א' };
  for (const t of [90,80,70,60,50,40,30,20,10]) { while (y >= t) { result += tens[t]; y -= t; } }
  for (const o of [9,8,7,6,5,4,3,2,1]) { if (y === o) { result += ones[o]; y = 0; break; } }
  return insertGershayim(result);
}
function insertGershayim(letters) {
  const clean = String(letters).replace(/[\u05F3\u05F4]/g, '');
  const arr = [...clean];
  if (arr.length === 0) return clean;
  if (arr.length === 1) return arr[0] + '\u05F3';
  arr.splice(arr.length - 1, 0, '\u05F4');
  return arr.join('');
}

// ---- view mounting ----
const app = document.getElementById('app');

async function renderView(view /* 'day' | 'week' | 'month' */) {
  currentView = view;
  const loader = viewModules[`./${view}.js`];
  if (!loader) return;
  const mod = await loader();
  mod.mount(app);
  setActive(view);

  if (view === 'day') {
    const sel = localStorage.getItem('selectedDate');
    setHeaderDate(sel ? fromDateKey(sel) : new Date());
  } else {
    setHeaderDate(new Date());
  }
}

function setActive(view) {
  const map = {
    day:   document.querySelector('[data-viewbtn="day"]'),
    week:  document.querySelector('[data-viewbtn="week"]'),
    month: document.querySelector('[data-viewbtn="month"]'),
  };
  Object.entries(map).forEach(([k, btn]) => {
    if (!btn) return;
    const on = (k === view);
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
}

function navPeriod(dir /* 'prev' | 'next' | 'today' */) {
  if (location.hash === '#/categories') return;
  document.dispatchEvent(new CustomEvent('period-nav', { detail: dir }));
  if (currentView !== 'day') return;
  if (dir === 'today') { setHeaderDate(new Date()); return; }
  const d = new Date(headerCursor);
  d.setDate(d.getDate() + (dir === 'next' ? 1 : -1));
  setHeaderDate(d);
}

// ---- shell ----
function shellHTML() {
  const gridIcon = `
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" fill="currentColor"/>
    </svg>`;
  const trophyIcon = `
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16v2.5c0 3-2.2 5.5-5 5.5h-1l-2 3-2-3H9C6.2 13 4 10.5 4 7.5V5Zm0 13h16v2H4v-2Z" fill="currentColor"/>
    </svg>`;

  // NOTE: we assign id="viewRoot" AND class="o-viewroot"
  // so our shared CSS can control scroll + safe bottom padding.
  return `
    <main class="o-page">
      <section class="o-phone o-inner">

        <header class="o-header">
          <button class="c-topbtn c-topbtn--accent c-topbtn--profile" aria-label="פרופיל" title="פרופיל">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z" fill="currentColor"/>
            </svg>
          </button>

          <a class="looz-logo" aria-label="LooZ">
            <img class="brand-logo brand-logo--light" src="${logoLight}" alt="LooZ">
            <img class="brand-logo brand-logo--dark"  src="${logoDark}"  alt="LooZ">
          </a>

          <button class="c-topbtn c-topbtn--accent c-topbtn--settings" aria-label="הגדרות" title="הגדרות">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M5 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm7 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm7 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" fill="currentColor"/>
            </svg>
          </button>
        </header>

        <!-- Lemon center + quick dock -->
        <div class="c-lemon-area">
          <button id="lemonToggle"
                  class="c-lemonbtn"
                  type="button"
                  aria-label="פתח/סגור סרגל מהיר"
                  aria-expanded="false">
            <svg class="c-lemonbtn__svg" viewBox="0 0 48 48" aria-hidden="true">
              <defs>
                <radialGradient id="lemGrad" cx="38%" cy="35%" r="70%">
                  <stop offset="0%"  stop-color="#FFF6B8"/>
                  <stop offset="55%" stop-color="#FFE067"/>
                  <stop offset="100%" stop-color="#F7C843"/>
                </radialGradient>
                <linearGradient id="lemShine" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#FFFFFF" stop-opacity=".98"/>
                  <stop offset="100%" stop-color="#FFFFFF" stop-opacity=".82"/>
                </linearGradient>
                <path id="lemSilhouette"
                      d="M36.8,13.2
                         C30.4,7.0,19.6,7.0,13.2,13.2
                         c-5.0,5.0-5.0,13.6,0,18.6
                         c5.0,5.0,13.6,5.2,18.6,0.2
                         C37.6,27.6,38.4,19.6,36.8,13.2 Z" />
              </defs>
              <g transform="translate(2 2) rotate(-8 22 22)">
                <use href="#lemSilhouette" fill="url(#lemGrad)"/>
                <path fill="url(#lemShine)"
                      d="M33.2,12.2
                         c-6.8,2.0-12.0,8.0-13.2,15.8
                         c-0.2,1.4-0.2,2.8-0.1,4.0
                         c2.6-6.6,8.6-12.4,15.6-15.2
                         c0.4-0.2,0.8-0.3,1.2-0.4
                         C36.0,14.8,34.8,13.2,33.2,12.2 Z"/>
                <circle cx="10.6" cy="31.8" r="2.2" fill="#F1B731"/>
                <use href="#lemSilhouette" fill="none" stroke="#D9A21C" stroke-opacity=".35" stroke-width=".9"/>
              </g>
            </svg>
          </button>

          <!-- Centered dock -->
          <div id="quickDock" class="c-dock" data-role="searchbar" hidden aria-hidden="true">
            <button class="c-dock__side c-dock__left" aria-label="קטגוריות" title="קטגוריות">${gridIcon}</button>
            <label class="c-dock__search" for="lemonSearch">
              <input id="lemonSearch" type="search" inputmode="search" placeholder="חפש פעילויות…" autocomplete="off" />
            </label>
            <button class="c-dock__side c-dock__right" aria-label="חבר׳ה" title="חבר׳ה">${trophyIcon}</button>
          </div>
        </div>

        <!-- date + greeting -->
        <div class="c-meta-block">
          <div class="c-date"></div>
          <p class="c-greet">ברוכים השבים <b>${getUserName()}</b> 👋</p>
        </div>

        <!-- view switch -->
        <nav class="c-view-switch" aria-label="תצוגה">
          <button class="c-headbtn" data-viewbtn="day"   aria-pressed="false">יום</button>
          <button class="c-headbtn" data-viewbtn="week"  aria-pressed="false">שבוע</button>
          <button class="c-headbtn" data-viewbtn="month" aria-pressed="false">חודש</button>
        </nav>

        <div class="c-period-mini">
          <button class="c-pillnav" data-prev  aria-label="קודם">‹</button>
          <button class="c-pillnav c-pillnav--today" data-today aria-label="היום">היום</button>
          <button class="c-pillnav" data-next  aria-label="הבא">›</button>
        </div>

        <!-- CONTENT SLOT:
             viewRoot is our scroll container for day/week/month -->
        <section id="viewRoot" class="o-viewroot" aria-live="polite"></section>

        <!-- sentinel for showing the floating orb CTA when near bottom -->
        <div id="orb-sentinel" class="c-orb-spacer" aria-hidden="true"></div>

        <div class="c-bottom-cta">
          <button class="c-cta c-cta--bang btn-create-orb" aria-label="צור אירוע"></button>
        </div>
      </section>
    </main>
  `;
}

// ---- wire ----
function wireShell(root) {
  /* view switch (we route via hash so router mounts into #viewRoot) */
  root.querySelector('[data-viewbtn="day"]')  ?.addEventListener('click', () => { location.hash = '#/day';  });
  root.querySelector('[data-viewbtn="week"]') ?.addEventListener('click', () => { location.hash = '#/week'; });
  root.querySelector('[data-viewbtn="month"]')?.addEventListener('click', () => { location.hash = '#/month';});

  /* mini period nav */
  root.querySelector('[data-prev]') ?.addEventListener('click', () => navPeriod('prev'));
  root.querySelector('[data-next]') ?.addEventListener('click', () => navPeriod('next'));
  root.querySelector('[data-today]')?.addEventListener('click', () => navPeriod('today'));

  /* dock side buttons: LEFT = Categories (grid), RIGHT = Social (trophy) */
  const leftBtn  = root.querySelector('.c-dock__left');
  const rightBtn = root.querySelector('.c-dock__right');

  leftBtn ?.addEventListener('click',  (e) => { e.stopPropagation(); location.hash = '#/categories'; });
  rightBtn?.addEventListener('click', (e) => { e.stopPropagation(); location.hash = '#/social'; });

  /* Lemon dock toggle */
  const lemonBtn = root.querySelector('#lemonToggle');
  const dock     = root.querySelector('#quickDock');
  const search   = root.querySelector('#lemonSearch');

  if (lemonBtn && dock) {
    const openDock  = () => {
      lemonBtn.setAttribute('aria-expanded', 'true');
      lemonBtn.classList.add('is-on');
      dock.hidden = false;
      requestAnimationFrame(() => {
        dock.classList.add('is-open');
        dock.setAttribute('aria-hidden', 'false');
      });
      search?.focus({ preventScroll: true });
    };
    const closeDock = () => {
      lemonBtn.setAttribute('aria-expanded', 'false');
      lemonBtn.classList.remove('is-on');
      dock.classList.remove('is-open');
      dock.setAttribute('aria-hidden', 'true');
      setTimeout(() => { dock.hidden = true; }, 180);
    };

    lemonBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = lemonBtn.getAttribute('aria-expanded') === 'true';
      open ? closeDock() : openDock();
    });

    dock.addEventListener('click', (e) => e.stopPropagation());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lemonBtn.getAttribute('aria-expanded') === 'true') closeDock();
    });
    document.addEventListener('click', (e) => {
      if (!dock || dock.hidden) return;
      if (!dock.contains(e.target) && !lemonBtn.contains(e.target)) closeDock();
    });
  }

  /* PROFILE + SETTINGS top buttons */
  root.querySelector('.c-topbtn--profile') ?.addEventListener('click', openProfile);
  root.querySelector('.c-topbtn--settings')?.addEventListener('click', openSettings);

  /* CREATE EVENT orb — only on non-social pages */
  root.addEventListener('click', (e) => {
    if (document.body.getAttribute('data-view') === 'social') return;
    const btn = e.target.closest('.btn-create-orb');
    if (!btn) return;
    const dk = localStorage.getItem('selectedDate') || undefined; // "YYYY-MM-DD"
    openCreateModal(dk);
  });
}

// settings navigation
async function openSettings() {
  try {
    if (location.hash !== '#/settings') {
      history.pushState({ page: 'settings' }, '', '#/settings');
    }
    const loader = pageModules['./settings.js'];
    if (!loader) { console.error('settings.js not found'); return; }
    const mod = await loader();
    const mountSettings = mod.default || mod.mount;
    if (typeof mountSettings === 'function') mountSettings();
    else console.error('settings.js has no default/mount export');
  } catch (err) { console.error('Failed to open settings:', err); }
}

// profile navigation
async function openProfile() {
  try {
    if (location.hash !== '#/profile') {
      history.pushState({ page: 'profile' }, '', '#/profile');
    }
    const loader = pageModules['./profile.js'];
    if (!loader) { console.error('profile.js not found'); return; }
    const mod = await loader();
    const mountProfile = mod.default?.mount || mod.mount || mod.default;
    if (typeof mountProfile === 'function') mountProfile();
    else console.error('profile.js has no default/mount export');
  } catch (err) { console.error('Failed to open profile:', err); }
}

/* Ensure the home shell exists before mounting a lazy page
   (prevents "missing header" on back/forward or theme toggle) */
function ensureHomeShell() {
  const hasShell = document.querySelector('.o-page');
  if (!hasShell) {
    // mount the shell
    mount(document.getElementById('app'));
  }
}

// restore on Back/Forward (supports profile & social)
window.addEventListener('popstate', async () => {
  if (location.hash === '#/settings') {
    ensureHomeShell();
    const mod = await pageModules['./settings.js']();
    (mod.default || mod.mount)?.();
  } else if (location.hash === '#/profile') {
    ensureHomeShell();
    const mod = await pageModules['./profile.js']();
    (mod.default?.mount || mod.mount || mod.default)?.();
  } else if (location.hash === '#/social') {
    ensureHomeShell();
    const mod = await pageModules['./social.js']();
    (mod.default?.mount || mod.mount || mod.default)?.(document.getElementById('app'));
    window.scrollTo(0, 0);
  } else {
    const app = document.getElementById('app');
    if (app) mount(app);
  }
});

// ---- public mount ----
export function mount(root) {
  document.body.setAttribute('data-view', 'home');
  root.innerHTML = shellHTML();
  wireShell(root);

  // default boot is MONTH now
  const boot = localStorage.getItem('defaultView') || 'month';
  if (!location.hash || location.hash === '#/home') {
    location.hash = `#/${boot}`;
  } else {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  const sel = localStorage.getItem('selectedDate');
  setHeaderDate(sel ? fromDateKey(sel) : new Date());
  startTodayTicker();

  // Show orb only near the bottom of scroll
  const orb = document.querySelector('.c-bottom-cta');
  const sentinel = document.getElementById('orb-sentinel');
  if (orb && sentinel && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) orb.classList.add('is-visible');
      else orb.classList.remove('is-visible');
    }, { threshold: 0.01 });
    io.observe(sentinel);
  } else {
    orb?.classList.add('is-visible');
  }
}

// cross-view: go to a specific day
document.addEventListener('go-day', async (e) => {
  const dk = e.detail;
  if (dk) {
    localStorage.setItem('selectedDate', dk);
    setHeaderDate(fromDateKey(dk));
  }
  const loadDay = viewModules['./day.js'];
  const mod = await loadDay();
  const app = document.getElementById('app');
  mod.mount(app);
  currentView = 'day';
  setActive('day');
});

// Apply stored pill colors ASAP on load
(() => {
  try {
    const bg = localStorage.getItem('pillBg');
    const br = localStorage.getItem('pillBorder');
    const s = document.documentElement.style;
    if (bg) s.setProperty('--task-pill-bg', bg);
    if (br) s.setProperty('--task-pill-border', br);
  } catch {}
})();
