// src/utils/theme.js
const KEY = 'looz.theme'; // canonical storage key: use only this

export function getTheme() {
  return localStorage.getItem(KEY) || (
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
}

export function applyTheme(mode) {
  const root = document.documentElement;
  root.classList.toggle('is-dark', mode === 'dark');
  root.setAttribute('data-theme', mode);
}

export function setTheme(mode) {
  localStorage.setItem(KEY, mode);
  applyTheme(mode);
}

// Optional: sync with system if user never picked a theme
export function initThemeListeners() {
  try {
    const mm = window.matchMedia('(prefers-color-scheme: dark)');
    const stored = localStorage.getItem(KEY);
    // Only follow system if user hasn't explicitly chosen
    if (!stored && mm && typeof mm.addEventListener === 'function') {
      mm.addEventListener('change', (e) => applyTheme(e.matches ? 'dark' : 'light'));
    }
  } catch (_) {}
}
