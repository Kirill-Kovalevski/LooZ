// src/pages/home.js
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

// app background: user asked for whitesmoke
const APP_BG = '#F5F5F5';

// per-user LS helpers
const LS_PREFIX = 'looz';
const curUid = () =>
  auth.currentUser?.uid ||
  (getUser?.() && getUser().uid) ||
  'guest';
const scopedKey = (k) => `${LS_PREFIX}:${curUid()}:${k}`;
const lsScopedGet = (k) => localStorage.getItem(scopedKey(k));

let headerCursor = new Date();
let currentView  = 'month';

// views to be bundled
const viewModules = import.meta.glob('./{day,week,month}.js');
// lazy pages
const pageModules = import.meta.glob('./{settings,profile,social}.js');

/* ─────────────────────────────────────────
   NAME helpers
────────────────────────────────────────── */
function getRuntimeUser() {
  return auth.currentUser || getUser?.() || null;
}

function getUserNamePieces() {
  const fLS = lsScopedGet('firstName');
  const lLS = lsScopedGet('lastName');

  const fGlobal = localStorage.getItem('firstName');
  const lGlobal = localStorage.getItem('lastName');

  const runtime = getRuntimeUser();
  let rtFirst = '';
  let rtLast  = '';

  if (runtime?.displayName) {
    const parts = runtime.displayName.split(' ').filter(Boolean);
    rtFirst = parts[0] || '';
    rtLast  = parts[1] || '';
  } else if (runtime?.email) {
    rtFirst = runtime.email.split('@')[0];
  }

  const first = fLS || fGlobal || rtFirst || '';
  const last  = lLS || lGlobal || rtLast  || '';

  return { first, last };
}

// build display name (no "אורח" here)
function buildDisplayNameHTMLOrEmpty() {
  const { first, last } = getUserNamePieces();

  if (!first && !last) return '';

  if (first && !last) {
    return `<span class="fname" dir="ltr" style="color:#226F54;">${first}</span>`;
  }

  const initial = last ? last[0] : '';
  const initialHTML = initial
    ? `<span class="lname-initial" dir="ltr" style="color:#226F54;">${initial}.</span>`
    : '';

  return `
    <span class="fname" dir="ltr" style="color:#226F54;">${first}</span>
    ${initialHTML}
  `;
}

// boom animation trigger
function runNameBoom() {
  const el = document.querySelector('.c-greet-name');
  if (!el) return;
  el.classList.remove('is-boom');
  void el.offsetWidth;
  el.classList.add('is-boom');
}

/**
 * apply name into greeting
 * @param {boolean} initial - if true: do NOT show guest
 */
function applyGreetingName(initial = false) {
  const nameWrap = document.querySelector('.c-greet-name');
  if (!nameWrap) return;

  const html = buildDisplayNameHTMLOrEmpty();

  if (html) {
    nameWrap.innerHTML = html;
    runNameBoom();
  } else {
    if (!initial) {
      nameWrap.innerHTML = `<span dir="rtl">אורח</span>`;
    } else {
      nameWrap.innerHTML = '';
    }
  }
}

/* ─────────────────────────────────────────
   DATE header
────────────────────────────────────────── */
function startTodayTicker() {
  const now  = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
  const ms   = next.getTime() - now.getTime();
  setTimeout(() => {
    setHeaderDate(new Date());
    startTodayTicker();
  }, ms);
}

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

function toHebrewNumerals(num) {
  const table = [
    '', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט',
    'י', 'יא', 'יב', 'יג', 'יד', 'טו', 'טז', 'יז', 'יח', 'יט',
    'כ', 'כא', 'כב', 'כג', 'כד', 'כה', 'כו', 'כז', 'כח', 'כט', 'ל', 'לא'
  ];
  const raw = table[num] || String(num);
  return insertGershayim(raw);
}
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

/* ─────────────────────────────────────────
   VIEWS
────────────────────────────────────────── */
function mountFromModule(mod, root, viewName) {
  let fn = null;
  if (mod && typeof mod.mount === 'function') fn = mod.mount;
  else if (mod?.default && typeof mod.default.mount === 'function') fn = mod.default.mount;
  else if (typeof mod?.default === 'function') fn = mod.default;
  else if (typeof mod?.render === 'function') fn = mod.render;
  else if (typeof mod === 'function') fn = mod;
  if (typeof fn === 'function') {
    fn(root);
  } else {
    console.warn('LooZ: no mountable export for', viewName);
  }
}

async function renderView(view) {
  currentView = view;
  const loader = viewModules[`./${view}.js`];
  if (!loader) {
    console.warn('LooZ: no module for view', view);
    return;
  }
  const mod = await loader();
  const viewRoot = document.getElementById('viewRoot') || document.getElementById('app');
  if (!viewRoot) return;
  mountFromModule(mod, viewRoot, view);
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

function navPeriod(dir) {
  if (location.hash === '#/categories') return;
  document.dispatchEvent(new CustomEvent('period-nav', { detail: dir }));
  if (currentView !== 'day') return;
  if (dir === 'today') { setHeaderDate(new Date()); return; }
  const d = new Date(headerCursor);
  d.setDate(d.getDate() + (dir === 'next' ? 1 : -1));
  setHeaderDate(d);
}

/* ─────────────────────────────────────────
   SHELL
────────────────────────────────────────── */
function shellHTML() {
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
            <span class="c-lemonbtn__mask">
              <span class="c-lemonbtn__inner">
                <img src="${lemonIcon}" alt="" class="c-lemonbtn__img" />
              </span>
            </span>
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
            <span class="greet-label">ברוכים השבים,</span>
            <span class="c-greet-name"></span>
          </p>
          <p class="c-subgreet">
            לו״ז מושלם מחכה לך
          </p>
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

        <section id="viewRoot" class="o-viewroot" aria-live="polite"></section>

        <div id="orb-sentinel" class="c-orb-spacer" aria-hidden="true"></div>

        <div class="c-bottom-cta">
          <button class="c-cta c-cta--bang btn-create-orb" aria-label="צור אירוע"></button>
        </div>
      </section>
    </main>
  `;
}

/* ─────────────────────────────────────────
   Aggressive recolor of lemon PNG
────────────────────────────────────────── */
async function recolorLemonPNG(imgEl) {
  if (!imgEl) return;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = lemonIcon;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // target = #f5f5f5
    const targetR = 0xF5;
    const targetG = 0xF5;
    const targetB = 0xF5;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // repaint very light pixels to exact bg
      if (r > 232 && g > 232 && b > 232 && a > 10) {
        data[i]     = targetR;
        data[i + 1] = targetG;
        data[i + 2] = targetB;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    imgEl.src = canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('lemon recolor failed', err);
  }
}

/* ─────────────────────────────────────────
   disable weather → remove meteorological cards
────────────────────────────────────────── */
function disableWeatherEverywhere() {
  const weatherKeys = [
    'weatherEnabled',
    'weatherOn',
    'showWeather',
    'monthWeather',
    'monthWeatherLayout'
  ];
  weatherKeys.forEach(k => localStorage.setItem(k, '0'));
  localStorage.setItem('monthWeatherLayout', 'plain');
  document.dispatchEvent(new CustomEvent('weather-pref-changed', {
    detail: { enabled: false, layout: 'plain' }
  }));
}

/* ─────────────────────────────────────────
   wire shell
────────────────────────────────────────── */
function wireShell(root) {
  const setHashView = (view) => {
    localStorage.setItem('defaultView', view);
    renderView(view);
  };

  root.querySelector('[data-viewbtn="day"]')  ?.addEventListener('click', () => setHashView('day'));
  root.querySelector('[data-viewbtn="week"]') ?.addEventListener('click', () => setHashView('week'));
  root.querySelector('[data-viewbtn="month"]')?.addEventListener('click', () => setHashView('month'));

  root.querySelector('[data-prev]') ?.addEventListener('click', () => navPeriod('prev'));
  root.querySelector('[data-next]') ?.addEventListener('click', () => navPeriod('next'));
  root.querySelector('[data-today]')?.addEventListener('click', () => navPeriod('today'));

  const leftBtn  = root.querySelector('.c-dock__left');
  const rightBtn = root.querySelector('.c-dock__right');
  leftBtn ?.addEventListener('click',  (e) => { e.stopPropagation(); location.hash = '#/categories'; });
  rightBtn?.addEventListener('click', (e) => { e.stopPropagation(); location.hash = '#/social'; });

  const lemonBtn   = root.querySelector('#lemonToggle');
  const dock       = root.querySelector('#quickDock');
  const search     = root.querySelector('#lemonSearch');
  const lemonImg   = root.querySelector('.c-lemonbtn__img');
  const profileBtn = root.querySelector('.c-topbtn--profile');

  recolorLemonPNG(lemonImg);

  if (lemonBtn && dock) {
    const openDock  = () => {
      lemonBtn.setAttribute('aria-expanded', 'true');
      dock.hidden = false;
      requestAnimationFrame(() => {
        dock.classList.add('is-open');
        dock.setAttribute('aria-hidden', 'false');
      });
      search?.focus({ preventScroll: true });
    };
    const closeDock = () => {
      lemonBtn.setAttribute('aria-expanded', 'false');
      dock.classList.remove('is-open');
      dock.setAttribute('aria-hidden', 'true');
      setTimeout(() => { dock.hidden = true; }, 180);
    };

    // small tilt on load
    lemonBtn.classList.add('is-stretch');

    lemonBtn.addEventListener('animationend', (ev) => {
      if (ev.animationName === 'lemonStretch') {
        lemonBtn.classList.remove('is-stretch');
      }
      if (ev.animationName === 'lemonFlip') {
        lemonBtn.classList.remove('is-flip');
      }
    });

    lemonBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      lemonBtn.classList.remove('is-flip');
      void lemonBtn.offsetWidth;
      lemonBtn.classList.add('is-flip');
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

  // make lemon same size as profile/settings, but inner is smaller+transparent
  if (profileBtn && lemonBtn) {
    requestAnimationFrame(() => {
      const w = profileBtn.offsetWidth;
      const h = profileBtn.offsetHeight;
      if (w && h) {
        lemonBtn.style.width  = w + 'px';
        lemonBtn.style.height = h + 'px';
        lemonBtn.style.borderRadius =
          getComputedStyle(profileBtn).borderRadius || '9999px';

        const mask  = root.querySelector('.c-lemonbtn__mask');
        const inner = root.querySelector('.c-lemonbtn__inner');
        const img   = root.querySelector('.c-lemonbtn__img');

        if (mask) {
          mask.style.width  = '100%';
          mask.style.height = '100%';
        }
        if (inner) {
          // here's your change: smaller + transparent
          inner.style.width  = '70%';
          inner.style.height = '70%';
          inner.style.background = 'transparent';
          inner.style.display = 'flex';
          inner.style.alignItems = 'center';
          inner.style.justifyContent = 'center';
        }
        if (img) {
          img.style.width = '100%';
          img.style.height = 'auto';
          img.style.display = 'block';
        }
      }
    });
  }

  root.querySelector('.c-topbtn--profile') ?.addEventListener('click', openProfile);
  root.querySelector('.c-topbtn--settings')?.addEventListener('click', openSettings);

  root.addEventListener('click', (e) => {
    if (document.body.getAttribute('data-view') === 'social') return;
    const btn = e.target.closest('.btn-create-orb');
    if (!btn) return;
    const dk = localStorage.getItem('selectedDate') || undefined;
    openCreateModal(dk);
  });

  const nameEl = root.querySelector('.c-greet-name');
  if (nameEl) {
    nameEl.addEventListener('animationend', (ev) => {
      if (
        ev.animationName === 'namePop_2025' ||
        ev.animationName === 'nameGlow_2025' ||
        ev.animationName === 'nameBurst_2025'
      ) {
        nameEl.classList.remove('is-boom');
      }
    });
  }

  // first fill — no guest
  applyGreetingName(true);

  // fill again when auth resolves
  if (typeof auth?.onAuthStateChanged === 'function') {
    auth.onAuthStateChanged(() => applyGreetingName(false));
  } else {
    setTimeout(() => applyGreetingName(false), 1200);
  }
}

/* ─────────────────────────────────────────
   settings / profile
────────────────────────────────────────── */
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

/* ─────────────────────────────────────────
   public mount
────────────────────────────────────────── */
export function mount(root) {
  document.body.setAttribute('data-view', 'home');
  root.innerHTML = shellHTML();

  // inject style once
  const styleId = 'home-inline-style';
  if (!document.getElementById(styleId)) {
    const st = document.createElement('style');
    st.id = styleId;
    st.textContent = `
      :root,
      body,
      .o-page,
      .o-phone,
      .o-inner,
      .o-header,
      .c-lemon-area,
      .looz-logo {
        background-color: ${APP_BG};
      }
      .c-lemonbtn {
        border:0;
        outline:0;
        background:inherit;
        border-radius:9999px;
        display:flex;
        align-items:center;
        justify-content:center;
        transform-origin:center;
      }
      .c-lemonbtn__mask {
        width:100%;
        height:100%;
        background:transparent;
        border-radius:9999px;
        display:flex;
        align-items:center;
        justify-content:center;
      }
      .c-lemonbtn__inner {
        background:transparent;
        display:flex;
        align-items:center;
        justify-content:center;
      }
      .c-lemonbtn.is-stretch {
        animation: lemonStretch 0.7s ease-out;
      }
      .c-lemonbtn.is-flip {
        animation: lemonFlip 0.55s ease-out;
      }
      @keyframes lemonStretch {
        0% { transform: rotateZ(0deg); }
        40% { transform: rotateZ(-11deg) scale(1.02, 0.99); }
        100% { transform: rotateZ(0deg) scale(1,1); }
      }
      @keyframes lemonFlip {
        0% { transform: rotateY(0deg); }
        100% { transform: rotateY(180deg); }
      }

      .c-meta-block .c-date {
        margin-bottom: 1rem;
      }
      .c-greet {
        margin:0;
        font-weight:800;
        font-size:.92rem;
        line-height:1.1;
        color:#568EA3;
        display:inline-flex;
        gap:.35rem;
        align-items:center;
        justify-content:center;
      }
      .c-greet-name {
        position:relative;
        display:inline-flex;
        gap:.3rem;
        align-items:center;
        color:#226F54;
        font-weight:800;
      }
      .c-greet-name.is-boom {
        animation: namePop_2025 0.22s ease-out;
      }
      .c-greet-name.is-boom::after {
        content: "";
        position: absolute;
        inset: -10px -20px;
        border-radius: 9999px;
        background: radial-gradient(circle,
          rgba(247, 209, 89, 0.7) 0%,
          rgba(247, 209, 89, 0.25) 40%,
          rgba(247, 209, 89, 0) 70%);
        animation: nameGlow_2025 0.38s ease-out forwards;
        pointer-events: none;
        filter: drop-shadow(0 4px 10px rgba(247, 209, 89, 0.25));
      }
      .c-greet-name.is-boom::before {
        content: "";
        position: absolute;
        top: 50%;
        left: 50%;
        width: 46px;
        height: 46px;
        border-radius: 9999px;
        border-top: 2px solid rgba(247, 209, 89, .8);
        border-right: 2px solid rgba(247, 209, 89, 0);
        border-left: 2px solid rgba(247, 209, 89, 0);
        border-bottom: 2px solid rgba(247, 209, 89, 0);
        transform: translate(-50%, -50%) scale(.35);
        animation: nameBurst_2025 0.42s ease-out forwards;
        pointer-events: none;
      }
      @keyframes namePop_2025 {
        0%   { transform: scale(1); }
        35%  { transform: scale(1.04); }
        100% { transform: scale(1); }
      }
      @keyframes nameGlow_2025 {
        0%   { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.06); }
      }
      @keyframes nameBurst_2025 {
        0%   { opacity: 1; transform: translate(-50%, -50%) scale(.35); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(1.05); }
      }
      @media (prefers-reduced-motion: reduce) {
        .c-greet-name.is-boom,
        .c-greet-name.is-boom::after,
        .c-greet-name.is-boom::before {
          animation: none !important;
        }
      }
      .c-subgreet {
        margin-top:.28rem;
        margin-bottom:0;
        font-weight:800;
        font-size:.9rem;
        color:#568EA3;
      }
    `;
    document.head.appendChild(st);
  }

  wireShell(root);

  // remove meteorological data
  disableWeatherEverywhere();

  const boot = localStorage.getItem('defaultView') || 'month';
  renderView(boot);

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
  mountFromModule(mod, viewRoot, 'day');
  currentView = 'day';
  setActive('day');
});

// listen to default-view changes from settings
document.addEventListener('default-view-changed', (e) => {
  const view = e.detail?.view;
  if (!view) return;
  renderView(view);
});

// hash router
window.addEventListener('hashchange', () => {
  const h = location.hash.replace(/^#\//, '');
  if (h === 'day' || h === 'week' || h === 'month') {
    renderView(h);
  }
});

// make global helper available
window.__loozGoView = (v) => renderView(v);

// restore pill colors
(() => {
  try {
    const bg = localStorage.getItem('pillBg');
    const br = localStorage.getItem('pillBorder');
    const s = document.documentElement.style;
    if (bg) s.setProperty('--task-pill-bg', bg);
    if (br) s.setProperty('--task-pill-border', br);
  } catch {}
})();
