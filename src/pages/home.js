// /src/pages/home.js
// NOTE: make sure vite.config.js has:  export default defineConfig({ base: '/LooZ/' })
import logoLight from '../icons/main-logo.png';
import logoDark  from '../icons/dark-logo.png';
import lemonIcon from '../icons/lemon-icon.png';
import { openCreateModal } from '../components/create.js';
import { initTaskFX } from '../utils/effects.js';
import { auth } from '../core/firebase.js';
import { getUser } from '../services/auth.service.js';

if (!window.__taskFxInit) {
  window.__taskFxInit = true;
  if (document.readyState !== 'loading') {
    initTaskFX(document);
  } else {
    document.addEventListener('DOMContentLoaded', () => initTaskFX(document), { once: true });
  }
}

// ---- per-user helpers ----
const LS_PREFIX = 'looz';
const curUid = () =>
  auth.currentUser?.uid ||
  (getUser?.() && getUser().uid) ||
  'guest';
const scopedKey = (k) => `${LS_PREFIX}:${curUid()}:${k}`;
const lsScopedGet = (k) => localStorage.getItem(scopedKey(k));

function fromDateKey(key) {
  if (!key || typeof key !== 'string') return new Date();
  const [y, m, d] = key.split('-').map(v => parseInt(v, 10));
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

let headerCursor = new Date();
let currentView  = 'month';

// IMPORTANT: static view map so Vite bundles them for GitHub Pages
const viewModules = import.meta.glob('./{day,week,month}.js');
// lazy pages (full-page routes)
const pageModules = import.meta.glob('./{settings,profile,social}.js');

/* -----------------------------------------------------------
   NAME helper
----------------------------------------------------------- */
function getUserNamePieces() {
  const fLS = lsScopedGet('firstName');
  const lLS = lsScopedGet('lastName');

  const fGlobal = localStorage.getItem('firstName');
  const lGlobal = localStorage.getItem('lastName');

  let first = fLS || fGlobal || '';
  let last  = lLS || lGlobal || '';

  // fallback to Firebase user
  if (!first) {
    const u = auth.currentUser || getUser?.();
    if (u?.displayName) {
      const parts = u.displayName.split(' ').filter(Boolean);
      first = parts[0] || '';
      last  = parts[1] || '';
    } else if (u?.email) {
      first = u.email.split('@')[0];
    }
  }

  return { first, last };
}

function getUserName() {
  const { first, last } = getUserNamePieces();
  if (!first) return 'אורח';
  const lastInitial = last ? `${last[0]}.` : '';
  return [first, lastInitial].filter(Boolean).join(' ');
}

// tick the header date shortly after local midnight
function startTodayTicker() {
  const now  = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
  const ms   = next.getTime() - now.getTime();
  setTimeout(() => {
    setHeaderDate(new Date());
    startTodayTicker();
  }, ms);
}

/* =========================
   Two-line header date
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
async function renderView(view /* 'day' | 'week' | 'month' */) {
  currentView = view;
  const loader = viewModules[`./${view}.js`];
  if (!loader) return;
  const mod = await loader();
  const viewRoot = document.getElementById('viewRoot') || document.getElementById('app');
  if (!viewRoot) return;

  // make it resilient to different exports
  const mountFn = mod.mount || mod.default?.mount || mod.default;
  if (typeof mountFn === 'function') {
    mountFn(viewRoot);
  }
  setActive(view);
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

/* ---------------------------
   hash router
   --------------------------- */
function routeFromHash() {
  const h = location.hash.replace(/^#\//, '');
  if (h === 'day' || h === 'week' || h === 'month') {
    renderView(h);
    return;
  }
  // other hashes handled elsewhere
}

// we'll attach this to window at the end too
function goView(view) {
  location.hash = '#/' + view;
  routeFromHash();
}

// ---- shell ----
function shellHTML() {
  const { first, last } = getUserNamePieces();
  const lastInitial = last ? `${last[0]}.` : '';

  const greetingLine1 = `
    <span class="greet-label">ברוכים השבים,</span>
    <span class="c-greet-name">${first} ${lastInitial}</span>
  `.trim();

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

        <!-- Lemon center -->
        <div class="c-lemon-area">
          <button id="lemonToggle"
                  class="c-lemonbtn"
                  type="button"
                  aria-label="סרגל מהיר"
                  aria-expanded="false">
            <img src="${lemonIcon}" alt="" class="c-lemonbtn__img" />
          </button>

          <div id="quickDock" class="c-dock" data-role="searchbar" hidden aria-hidden="true">
            <button class="c-dock__side c-dock__left" aria-label="קטגוריות" title="קטגוריות">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" fill="currentColor"/>
              </svg>
            </button>
            <label class="c-dock__search" for="lemonSearch">
              <input id="lemonSearch" type="search" inputmode="search" placeholder="חפש פעילויות…" autocomplete="off" />
            </label>
            <button class="c-dock__side c-dock__right" aria-label="חבר׳ה" title="חבר׳ה">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 5h16v2.5c0 3-2.2 5.5-5 5.5h-1l-2 3-2-3H9C6.2 13 4 10.5 4 7.5V5Zm0 13h16v2H4v-2Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- date + greeting -->
        <div class="c-meta-block" style="font-family:'Rubik','Segoe UI',system-ui,sans-serif;text-align:center;">
          <div class="c-date"></div>
          <p class="c-greet">
            ${greetingLine1}
          </p>
          <p class="c-subgreet">
            לו״ז מושלם מחכה לך
          </p>
        </div>

        <!-- view switch -->
        <nav class="c-view-switch" aria-label="תצוגה">
          <button class="c-headbtn" data-viewbtn="day"   aria-pressed="false" onclick="window.__loozGoView && window.__loozGoView('day')">יום</button>
          <button class="c-headbtn" data-viewbtn="week"  aria-pressed="false" onclick="window.__loozGoView && window.__loozGoView('week')">שבוע</button>
          <button class="c-headbtn" data-viewbtn="month" aria-pressed="false" onclick="window.__loozGoView && window.__loozGoView('month')">חודש</button>
        </nav>

        <div class="c-period-mini">
          <button class="c-pillnav" data-prev  aria-label="קודם">‹</button>
          <button class="c-pillnav c-pillnav--today" data-today aria-label="היום">היום</button>
          <button class="c-pillnav" data-next  aria-label="הבא">›</button>
        </div>

        <section id="viewRoot" class="o-viewroot" aria-live="polite"></section>

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
  const setHashView = (view) => {
    const target = `#/${view}`;
    if (location.hash !== target) {
      location.hash = target;
    }
    routeFromHash();
  };

  root.querySelector('[data-viewbtn="day"]')  ?.addEventListener('click', () => setHashView('day'));
  root.querySelector('[data-viewbtn="week"]') ?.addEventListener('click', () => setHashView('week'));
  root.querySelector('[data-viewbtn="month"]')?.addEventListener('click', () => setHashView('month'));

  root.querySelector('[data-prev]') ?.addEventListener('click', () => navPeriod('prev'));
  root.querySelector('[data-next]') ?.addEventListener('click', () => navPeriod('next'));
  root.querySelector('[data-today]')?.addEventListener('click', () => navPeriod('today'));

  // dock buttons
  const leftBtn  = root.querySelector('.c-dock__left');
  const rightBtn = root.querySelector('.c-dock__right');
  leftBtn ?.addEventListener('click',  (e) => { e.stopPropagation(); location.hash = '#/categories'; });
  rightBtn?.addEventListener('click', (e) => { e.stopPropagation(); location.hash = '#/social'; });

  // Lemon toggle
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

  // top buttons
  root.querySelector('.c-topbtn--profile') ?.addEventListener('click', openProfile);
  root.querySelector('.c-topbtn--settings')?.addEventListener('click', openSettings);

  // create orb
  root.addEventListener('click', (e) => {
    if (document.body.getAttribute('data-view') === 'social') return;
    const btn = e.target.closest('.btn-create-orb');
    if (!btn) return;
    const dk = localStorage.getItem('selectedDate') || undefined;
    openCreateModal(dk);
  });

  // run the greeting shine once
  const nameEl = root.querySelector('.c-greet-name');
  if (nameEl) {
    nameEl.classList.add('greet-flash');
    setTimeout(() => nameEl.classList.remove('greet-flash'), 2800);
  }
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
  } catch (err) { console.error('Failed to open profile:', err); }
}

function ensureHomeShell() {
  const hasShell = document.querySelector('.o-page');
  if (!hasShell) {
    const app = document.getElementById('app');
    if (app) mount(app);
  }
}

// restore on Back/Forward
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

  // inline styles for home tweaks
  const styleId = 'home-inline-style';
  if (!document.getElementById(styleId)) {
    const st = document.createElement('style');
    st.id = styleId;
    st.textContent = `
      .c-lemonbtn {
        width: 74px;
        height: 74px;
        background: #F5F6F5;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow: 0 10px 25px rgba(249,200,71,.0);
        border: 0 !important;
        outline: 0 !important;
        border-radius: 9999px;
        overflow: hidden; /* hide the yellow ring from the image */
      }
      .c-lemonbtn::before,
      .c-lemonbtn::after {
        border: 0 !important;
      }
      .c-lemonbtn__img {
        width: 54px;
        height: 54px;
        object-fit: contain;
        border: 0 !important;
        outline: 0 !important;
        background: transparent;
      }
      .c-meta-block .c-date {
        margin-bottom: 1.05rem; /* space ABOVE greetings */
      }
      .c-greet {
        margin: 0;
        font-weight: 800;
        font-size: .92rem;
        line-height: 1.15;
        color: #568EA3;
        display: inline-flex;
        gap: .4rem;
        justify-content: center;
        align-items: center;
      }
      .greet-label {
        color: #568EA3;
      }
      .c-greet-name {
        background-image: linear-gradient(125deg,#e5e4e2 0%,#f7d159 45%,#d4af37 85%);
        background-size: 200% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        font-weight: 800;
      }
      .greet-flash {
        animation: nameFlash 1.8s ease-out 0s 1;
      }
      @keyframes nameFlash {
        0%   { background-position: 180% 0; opacity: .3; }
        40%  { opacity: 1; }
        100% { background-position: 0% 0; opacity: 1; }
      }
      .c-subgreet {
        margin-top: .25rem; /* small space BETWEEN line 1 and 2 */
        margin-bottom: 0;
        font-weight: 800;
        font-size: .9rem;
        color: #568EA3;
      }
    `;
    document.head.appendChild(st);
  }

  wireShell(root);

  const boot = localStorage.getItem('defaultView') || 'month';
  location.hash = `#/${boot}`;
  routeFromHash();

  setHeaderDate(new Date());
  startTodayTicker();

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
  }
  const loadDay = viewModules['./day.js'];
  const mod = await loadDay();
  const viewRoot = document.getElementById('viewRoot') || document.getElementById('app');
  if (!viewRoot) return;

  const mountFn = mod.mount || mod.default?.mount || mod.default;
  if (typeof mountFn === 'function') mountFn(viewRoot);

  currentView = 'day';
  setActive('day');
});

document.addEventListener('default-view-changed', (e) => {
  const view = e.detail?.view;
  if (!view) return;

  localStorage.setItem('defaultView', view);

  const isHome =
    document.body.getAttribute('data-view') === 'home' &&
    (!location.hash || location.hash === '#/home' ||
     location.hash === '#/day' || location.hash === '#/week' || location.hash === '#/month');

  if (isHome) {
    location.hash = '#/' + view;
    typeof routeFromHash === 'function' && routeFromHash();
  }
});

// listen to hash changes globally
window.addEventListener('hashchange', routeFromHash);

// make the global helper available for inline onclick
window.__loozGoView = goView;

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
