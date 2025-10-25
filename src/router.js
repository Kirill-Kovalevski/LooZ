// /src/router.js
import { auth } from './core/firebase.js';

const APP_EL_ID = 'app';
const DEFAULT_VIEW_KEY = 'defaultView';
const SAFE = new Set([
  'home', 'day', 'week', 'month',
  'settings', 'profile', 'categories',
  'login', 'social'
]);
const PROTECTED = new Set([
  'home', 'day', 'week', 'month',
  'settings', 'profile', 'categories',
  'social'
]);

const $app = () => document.getElementById(APP_EL_ID) || document.body;

function normalize(h) {
  const raw = (h ?? location.hash).replace(/^#/, '');
  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const cleaned = path.replace(/\/{2,}/g, '/').replace(/[?#].*$/, '');
  const key = cleaned.replace(/^\//, '').toLowerCase();
  return SAFE.has(key) ? `/${key}` : '/home';
}

function getDefaultStartPath() {
  const d = (localStorage.getItem(DEFAULT_VIEW_KEY) || 'week').toLowerCase();
  return ['day', 'week', 'month'].includes(d) ? `/${d}` : '/week';
}

function isAuthed() {
  return !!auth.currentUser || !!localStorage.getItem('looz_uid');
}

async function mountPage(mod) {
  const m = await mod;
  const fn = m?.mount || m?.default?.mount || m?.default;
  if (typeof fn === 'function') fn($app());
  else console.warn('[router] page missing mount()');
}

async function show(name) {
  switch (name) {
    case 'home': return mountPage(import('./pages/home.js'));
    case 'day': return mountPage(import('./pages/day.js'));
    case 'week': return mountPage(import('./pages/week.js'));
    case 'month': return mountPage(import('./pages/month.js'));
    case 'settings': return mountPage(import('./pages/settings.js'));
    case 'profile': return mountPage(import('./pages/profile.js'));
    case 'categories': return mountPage(import('./pages/categories.js'));
    case 'login': return mountPage(import('./pages/login.js'));
    case 'social': return mountPage(import('./pages/social.js'));
    default: return mountPage(import('./pages/home.js'));
  }
}

export async function apply(h) {
  const path = normalize(h);
  const key = path.replace(/^\//, '');
  const needsAuth = PROTECTED.has(key);

  // Redirect to login if not authenticated
  if (needsAuth && !isAuthed()) {
    try {
      sessionStorage.setItem('looz.postLoginRedirect', `#/${key}`);
    } catch {}
    return location.replace('#/login');
  }

  // Redirect away from login if already authenticated
  if (key === 'login' && isAuthed()) {
    const saved = sessionStorage.getItem('looz.postLoginRedirect');
    if (saved) {
      sessionStorage.removeItem('looz.postLoginRedirect');
      location.replace(saved);
      return;
    }
    return location.replace(`#${getDefaultStartPath()}`);
  }

  return show(key);
}

export function start() {
  apply(location.hash || '#/home');
  window.addEventListener('hashchange', () => apply(location.hash));
}

export const startRouter = start;
export default { start, apply };
