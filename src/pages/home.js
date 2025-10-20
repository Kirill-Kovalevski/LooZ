// /src/pages/home.js
// NOTE: make sure vite.config.js has:  export default defineConfig({ base: '/LooZ/' })
import logoLight from '../icons/main-logo.png';
import logoDark  from '../icons/dark-logo.png';

// ---- tiny helpers ----
const HEB_DAYS = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const pad2     = n => String(n).padStart(2, '0');
const todayDM  = d => `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
const hebDay   = d => HEB_DAYS[d.getDay()];

let headerCursor = new Date();
let currentView  = 'week';

// IMPORTANT: static view map so Vite bundles them for GitHub Pages
const viewModules = import.meta.glob('./{day,week,month}.js');

// [ADDED] dynamic import for the settings page
const pageModules = import.meta.glob('./settings.js');

function getUserName() {
  const first = localStorage.getItem('firstName') || 'אורח';
  const last  = localStorage.getItem('lastName')  || '';
  return last ? `${first} ${last[0]}.` : first;
}
function setHeaderDate(d) {
  headerCursor = new Date(d);
  const el = document.querySelector('.c-date');
  if (el) el.textContent = `${hebDay(headerCursor)} ${todayDM(headerCursor)}`;
}

// ---- view mounting ----
const app = document.getElementById('app');

async function renderView(view /* 'day' | 'week' | 'month' */) {
  currentView = view;

  const loader = viewModules[`./${view}.js`];
  if (!loader) {
    console.error(`Unknown view "${view}"`);
    return;
  }
  const mod = await loader();
  mod.mount(app);
  setActive(view);

  // header date only moves in Day view
  if (view === 'day') {
    const sel = localStorage.getItem('selectedDate');
    setHeaderDate(sel ? new Date(sel) : new Date());
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
    const on = k === view;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
}

function navPeriod(dir /* 'prev' | 'next' | 'today' */) {
  // tell current view to change its period
  document.dispatchEvent(new CustomEvent('period-nav', { detail: dir }));

  // header date updates only in Day view
  if (currentView !== 'day') return;
  if (dir === 'today') { setHeaderDate(new Date()); return; }
  const d = new Date(headerCursor);
  d.setDate(d.getDate() + (dir === 'next' ? 1 : -1));
  setHeaderDate(d);
}

// ---- shell ----
function shellHTML() {
  const d = headerCursor;
  const dateStr = `${hebDay(d)} ${todayDM(d)}`;

  return `
    <main class="o-page">
      <section class="o-phone o-inner">

        <!-- header -->
        <header class="o-header">
          <button class="c-topbtn c-topbtn--profile" aria-label="פרופיל" title="פרופיל">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z" fill="currentColor"/>
            </svg>
          </button>

          <a class="looz-logo" aria-label="LooZ">
            <img class="brand-logo brand-logo--light" src="${logoLight}" alt="LooZ">
            <img class="brand-logo brand-logo--dark"  src="${logoDark}"  alt="LooZ">
          </a>

          <button class="c-topbtn c-topbtn--settings" aria-label="הגדרות" title="הגדרות">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M5 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm7 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm7 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" fill="currentColor"/>
            </svg>
          </button>
        </header>

        <!-- Lemon center + quick dock (hidden) -->
        <div class="c-lemon-area">
          <button id="lemonToggle"
                  class="c-lemonbtn"
                  type="button"
                  aria-label="פתח/סגור סרגל מהיר"
                  aria-expanded="false">
            <!-- Lemon SVG -->
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

          <!-- Hidden dock; absolutely positioned so no layout shift -->
          <div id="quickDock" class="c-dock" hidden aria-hidden="true">
            <button class="c-dock__side c-dock__left" aria-label="קטגוריות" title="קטגוריות">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <rect x="3" y="5"  width="18" height="3" rx="1.5"/>
                <rect x="3" y="10.5" width="18" height="3" rx="1.5"/>
                <rect x="3" y="16" width="18" height="3" rx="1.5"/>
              </svg>
            </button>

            <label class="c-dock__search" for="lemonSearch">
              <input id="lemonSearch" type="search" inputmode="search"
                     placeholder="חפש פעילויות…" autocomplete="off" />
            </label>

            <button class="c-dock__side c-dock__right" aria-label="חבר׳ה" title="חבר׳ה">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <circle cx="8"  cy="9" r="3"/>
                <circle cx="16" cy="9" r="3"/>
                <path d="M4 18c0-2.2 2.6-4 6-4s6 1.8 6 4"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- date + greeting -->
        <div class="c-meta-block">
          <div class="c-date">${dateStr}</div>
          <p class="c-greet">ברוכים השבים <b>${getUserName()}</b> 👋</p>
        </div>

        <!-- view switch -->
        <nav class="c-view-switch" aria-label="תצוגה">
          <button class="c-headbtn" data-viewbtn="day"   aria-pressed="false">יום</button>
          <button class="c-headbtn" data-viewbtn="week"  aria-pressed="false">שבוע</button>
          <button class="c-headbtn" data-viewbtn="month" aria-pressed="false">חודש</button>
        </nav>

        <!-- mini period nav -->
        <div class="c-period-mini">
          <button class="c-pillnav" data-prev  aria-label="קודם">‹</button>
          <button class="c-pillnav c-pillnav--today" data-today aria-label="היום">היום</button>
          <button class="c-pillnav" data-next  aria-label="הבא">›</button>
        </div>

        <!-- content slot -->
        <section id="viewRoot" class="o-viewroot" aria-live="polite"></section>

        <!-- orb sentinel (so the orb appears near bottom only) -->
        <div id="orb-sentinel" class="c-orb-spacer" aria-hidden="true"></div>

        <!-- bottom orb -->
        <div class="c-bottom-cta">
          <button class="c-cta c-cta--bang btn-create-orb" aria-label="צור אירוע"></button>
        </div>
      </section>
    </main>
  `;
}

// ---- wire ----
function wireShell(root) {
  // view switch
  root.querySelector('[data-viewbtn="day"]')  ?.addEventListener('click', () => renderView('day'));
  root.querySelector('[data-viewbtn="week"]') ?.addEventListener('click', () => renderView('week'));
  root.querySelector('[data-viewbtn="month"]')?.addEventListener('click', () => renderView('month'));

  // period nav
  root.querySelector('[data-prev]') ?.addEventListener('click', () => navPeriod('prev'));
  root.querySelector('[data-next]') ?.addEventListener('click', () => navPeriod('next'));
  root.querySelector('[data-today]')?.addEventListener('click', () => navPeriod('today'));

  // Lemon dock toggle (no layout shift)
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
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lemonBtn.getAttribute('aria-expanded') === 'true') closeDock();
    });
    document.addEventListener('click', (e) => {
      if (!dock || dock.hidden) return;
      if (!dock.contains(e.target) && !lemonBtn.contains(e.target)) closeDock();
    });
  }

  // [ADDED] SETTINGS BUTTON — open settings page
  const settingsBtn = root.querySelector('.c-topbtn--settings');
  if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
}

// [ADDED] navigate to settings (keeps history so Back returns)
async function openSettings() {
  try {
    if (location.hash !== '#/settings') {
      history.pushState({ page: 'settings' }, '', '#/settings');
    }
    const loader = pageModules['./settings.js'];
    if (!loader) { console.error('settings.js not found'); return; }
    const mod = await loader();
    const mountSettings = mod.default || mod.mount;
    if (typeof mountSettings === 'function') {
      // settings.js should render into #app by itself
      mountSettings();
    } else {
      console.error('settings.js has no default/mount export');
    }
  } catch (err) {
    console.error('Failed to open settings:', err);
  }
}

// [ADDED] restore on Back/Forward
window.addEventListener('popstate', async () => {
  if (location.hash === '#/settings') {
    const mod = await pageModules['./settings.js']();
    (mod.default || mod.mount)?.();
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

 const boot = localStorage.getItem('defaultView') || 'week';
renderView(boot);


  // Show orb only near the bottom
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
  const dk = e.detail; // "YYYY-MM-DD"
  if (dk) {
    localStorage.setItem('selectedDate', dk);
    setHeaderDate(new Date(dk));
  }
  const loadDay = viewModules['./day.js'];
  const mod = await loadDay();
  const app = document.getElementById('app');
  mod.mount(app);
  currentView = 'day';
  setActive('day');
});
// Apply stored pill colors ASAP on load (before views render)
(() => {
  try {
    const bg = localStorage.getItem('pillBg');
    const br = localStorage.getItem('pillBorder');
    const s = document.documentElement.style;
    if (bg) s.setProperty('--task-pill-bg', bg);
    if (br) s.setProperty('--task-pill-border', br);
  } catch {}
})();
/* ===== LooZ — Home shell behaviors (RTL, iPhone-first) ===== */
(function () {
  'use strict';

  /* ---------- Helpers ---------- */
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const pad2 = (n) => String(n).padStart(2, '0');

  /* ---------- Seasonal background: set soft palette by month ---------- */
  const month = new Date().getMonth(); // 0..11
  const PALETTES = [
    /* Jan..Dec (example gentle monthly shifts) */
    { s1:'hsl(150 60% 84%)', s2:'hsl(205 85% 86%)', s3:'hsl(265 70% 88%)', s4:'hsl(35 95% 87%)', s5:'hsl(355 70% 86%)' }, // Jan
    { s1:'hsl(155 60% 84%)', s2:'hsl(208 85% 86%)', s3:'hsl(268 70% 88%)', s4:'hsl(37 95% 87%)', s5:'hsl(355 70% 86%)' }, // Feb
    { s1:'hsl(160 60% 84%)', s2:'hsl(210 85% 86%)', s3:'hsl(270 70% 88%)', s4:'hsl(38 95% 87%)', s5:'hsl(356 70% 86%)' }, // Mar
    { s1:'hsl(162 60% 84%)', s2:'hsl(212 85% 86%)', s3:'hsl(272 70% 88%)', s4:'hsl(39 95% 87%)', s5:'hsl(356 70% 86%)' }, // Apr
    { s1:'hsl(164 60% 84%)', s2:'hsl(214 85% 86%)', s3:'hsl(274 70% 88%)', s4:'hsl(40 95% 87%)', s5:'hsl(357 70% 86%)' }, // May
    { s1:'hsl(166 60% 84%)', s2:'hsl(216 85% 86%)', s3:'hsl(276 70% 88%)', s4:'hsl(41 95% 87%)', s5:'hsl(357 70% 86%)' }, // Jun
    { s1:'hsl(168 60% 84%)', s2:'hsl(218 85% 86%)', s3:'hsl(278 70% 88%)', s4:'hsl(42 95% 87%)', s5:'hsl(358 70% 86%)' }, // Jul
    { s1:'hsl(170 60% 84%)', s2:'hsl(220 85% 86%)', s3:'hsl(280 70% 88%)', s4:'hsl(43 95% 87%)', s5:'hsl(358 70% 86%)' }, // Aug
    { s1:'hsl(165 60% 84%)', s2:'hsl(215 85% 86%)', s3:'hsl(276 70% 88%)', s4:'hsl(38 95% 87%)', s5:'hsl(356 70% 86%)' }, // Sep
    { s1:'hsl(160 60% 84%)', s2:'hsl(210 85% 86%)', s3:'hsl(272 70% 88%)', s4:'hsl(36 95% 87%)', s5:'hsl(355 70% 86%)' }, // Oct
    { s1:'hsl(155 60% 84%)', s2:'hsl(206 85% 86%)', s3:'hsl(268 70% 88%)', s4:'hsl(35 95% 87%)', s5:'hsl(355 70% 86%)' }, // Nov
    { s1:'hsl(152 60% 84%)', s2:'hsl(204 85% 86%)', s3:'hsl(266 70% 88%)', s4:'hsl(35 95% 87%)', s5:'hsl(355 70% 86%)' }, // Dec
  ];
  const pal = PALETTES[month];
  if (pal) {
    const rs = document.documentElement.style;
    rs.setProperty('--s1', pal.s1);
    rs.setProperty('--s2', pal.s2);
    rs.setProperty('--s3', pal.s3);
    rs.setProperty('--s4', pal.s4);
    rs.setProperty('--s5', pal.s5);
  }

  /* ---------- Greeting: show user's first name if available ---------- */
  try {
    // Accept either a stringified JSON or a plain string key from prior auth screens
    let user = localStorage.getItem('authUser') || localStorage.getItem('auth.user') || localStorage.getItem('auth.profile');
    if (user) {
      try { user = JSON.parse(user); } catch(_) { /* if plain string, keep it */ }
      const name = (user && (user.firstName || user.given_name || user.name)) || (typeof user === 'string' ? user : '');
      const first = (name || '').trim().split(/\s+/)[0];
      const nameSpot = $('.c-greet b') || $('#greetName');
      if (first && nameSpot) nameSpot.textContent = first;
    }
  } catch (e) {
    /* no-op */
  }

  /* ---------- Lemon orb toggles dock ---------- */
  const lemonBtn = $('.c-lemonbtn');
  const dock = $('.c-dock');
  if (lemonBtn && dock) {
    lemonBtn.addEventListener('click', () => {
      const on = lemonBtn.classList.toggle('is-on');
      dock.classList.toggle('is-open', on);
    });
  }

  /* ---------- Bottom CTA visibility based on scroll-in-view ---------- */
  const bottomCta = $('.c-bottom-cta');
  const viewRoot = $('.o-viewroot');
  if (bottomCta && viewRoot) {
    const syncCTA = () => {
      // Show CTA when near the bottom 1/3 of the view content
      const rect = viewRoot.getBoundingClientRect();
      const threshold = window.innerHeight * 0.66;
      bottomCta.classList.toggle('is-visible', rect.bottom < window.innerHeight + threshold);
    };
    document.addEventListener('scroll', syncCTA, { passive: true });
    viewRoot.addEventListener('scroll', syncCTA, { passive: true });
    window.addEventListener('resize', syncCTA);
    requestAnimationFrame(syncCTA);
  }

  /* ---------- View switch buttons (Day / Week / Month) ---------- */
  const headBtns = $$('.c-headbtn[data-view]');
  const gotoView = (view) => {
    // If your app uses different pages, replace with window.location = `${view}.html`
    document.body.setAttribute('data-view', view);
    headBtns.forEach(btn => btn.classList.toggle('is-active', btn.dataset.view === view));
    // Optional: fire a custom event if others depend on this
    document.dispatchEvent(new CustomEvent('VIEW_CHANGED', { detail: { view } }));
  };
  headBtns.forEach(btn => btn.addEventListener('click', () => gotoView(btn.dataset.view)));

  // Initialize active state from body[data-view] if present
  const currentView = document.body.getAttribute('data-view');
  if (currentView) headBtns.forEach(btn => btn.classList.toggle('is-active', btn.dataset.view === currentView));

})();
