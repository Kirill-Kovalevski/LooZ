// /src/router.js
import { auth } from './core/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

const APP_EL_ID = 'app';
const DEFAULT_VIEW_KEY = 'defaultView';

const SAFE = new Set([
  'home','day','week','month',
  'settings','profile','categories',
  'login','social'
]);

const PROTECTED = new Set([
  'home','day','week','month',
  'settings','profile','categories',
  'social'
]);

// ✅ settings is *not* inside the home shell anymore
const IN_SHELL = new Set([
  // routes that render inside the Home shell
  'day','week','month','profile','categories','social'
]);

const $app = () => document.getElementById(APP_EL_ID) || document.body;

function normalize(h) {
  const raw = (h ?? location.hash).replace(/^#/, '');
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const cleaned = path.replace(/\/{2,}/g, '/').replace(/[?#].*$/, '');
  const key = cleaned.replace(/^\//, '').toLowerCase();
  return SAFE.has(key) ? `/${key}` : '/home';
}

// ------- MONTH is the default view everywhere -------
function getDefaultStartPath() {
  const d = (localStorage.getItem(DEFAULT_VIEW_KEY) || 'month').toLowerCase();
  return ['day','week','month'].includes(d) ? `/${d}` : '/month';
}
function isAuthed() {
  return !!auth.currentUser || !!localStorage.getItem('looz_uid');
}

// Mount any module's exported mount()
async function mountPage(mod) {
  const m  = await mod;
  const fn = m?.mount || m?.default?.mount || m?.default;
  if (typeof fn === 'function') fn($app());
  else console.warn('[router] page missing mount()');
}

// Ensure the Home shell exists, then mount a child view inside it
async function showInsideShell(child /* 'day'|'week'|'month'|etc. */) {
  // 1) mount the shell if missing
  const hasShell = !!document.querySelector('.o-page');
  if (!hasShell) await mountPage(import('./pages/home.js'));

  // 2) mount the desired page (which renders into #viewRoot)
  switch (child) {
    case 'day':        return mountPage(import('./pages/day.js'));
    case 'week':       return mountPage(import('./pages/week.js'));
    case 'month':      return mountPage(import('./pages/month.js'));
    case 'profile':    return mountPage(import('./pages/profile.js'));
    case 'categories': return mountPage(import('./pages/categories.js'));
    case 'social':     return mountPage(import('./pages/social.js'));
    default:           return mountPage(import('./pages/month.js'));
  }
}

async function show(name) {
  if (name === 'login') {
    return mountPage(import('./pages/login.js'));
  }

  // ✅ settings: full-page, no home shell (so no יום/שבוע/חודש, no month view behind it)
  if (name === 'settings') {
    return mountPage(import('./pages/settings.js'));
  }

  if (IN_SHELL.has(name)) {
    return showInsideShell(name);
  }

  // fallback
  return showInsideShell('month');
}

/**
 * Guarded navigation
 */
export async function apply(h) {
  const path = normalize(h);
  const key  = path.replace(/^\//, '');
  const needsAuth = PROTECTED.has(key);

  // unauthenticated → login
  if (needsAuth && !isAuthed()) {
    try { sessionStorage.setItem('looz.postLoginRedirect', `#/${key}`); } catch {}
    if (location.hash !== '#/login') location.replace('#/login');
    return show('login');
  }

  // authenticated on login → redirect back or to default (month)
  if (key === 'login' && isAuthed()) {
    const saved = sessionStorage.getItem('looz.postLoginRedirect');
    if (saved) {
      sessionStorage.removeItem('looz.postLoginRedirect');
      location.replace(saved);
      return;
    }
    return location.replace(`#${getDefaultStartPath()}`);
  }

  // visiting #/home should actually show the default view in-shell
  if (key === 'home') {
    const target = getDefaultStartPath(); // -> /month by default
    if (location.hash !== `#${target}`) {
      location.replace(`#${target}`);
      return;
    }
  }

  return show(key);
}

/**
 * Boot the router
 */
export function start() {
  const hasHash = !!location.hash;
  const authed  = isAuthed();

  if (!hasHash) {
    location.replace(authed ? `#${getDefaultStartPath()}` : '#/login');
  } else {
    apply(location.hash);
  }

  window.addEventListener('hashchange', () => apply(location.hash));

  // react to auth changes (e.g., Google/Apple sign-in redirects)
  let authTick = 0;
  onAuthStateChanged(auth, () => {
    authTick++;
    const t = authTick;
    setTimeout(() => {
      if (t !== authTick) return;
      apply(location.hash || `#${getDefaultStartPath()}`);
    }, 10);
  });
}

export const startRouter = start;
export default { start, apply };
