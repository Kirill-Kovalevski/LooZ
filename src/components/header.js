// Header chrome (shell): profile LEFT, settings RIGHT, brand centered.
// Inline SVG icons adapt to light/dark via currentColor.

export function renderHeader() {
  return /* html */`
    <header class="o-header">
      <!-- Profile (LEFT) -->
      <button class="c-topbtn c-topbtn--profile" type="button" aria-label="פרופיל" id="btnProfile">
        ${iconProfileBiblical()}
      </button>

      <!-- Center brand logo pair (light/dark) -->
      <a href="#/home" class="looz-logo" aria-label="LooZ">
        <img class="brand-logo brand-logo--light" alt="LooZ" src="/src/icons/main-logo.png">
        <img class="brand-logo brand-logo--dark"  alt="LooZ" src="/src/icons/dark-logo.png">
      </a>

      <!-- Settings (RIGHT) -->
      <button class="c-topbtn c-topbtn--settings" type="button" aria-label="הגדרות" id="btnSettings">
        ${iconSettingsBiblical()}
      </button>
    </header>
  `;
}

export function initHeaderInteractions() {
  const s = document.getElementById('btnSettings');
  const p = document.getElementById('btnProfile');
  s?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('open-settings')));
  p?.addEventListener('click', () => document.dispatchEvent(new CustomEvent('open-profile')));
}

/* ---------- Icons ---------- */

function iconSettingsBiblical() {
  // “Three dots” on a rounded tablet
  return `
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" ry="4"
          fill="none" stroke="currentColor" stroke-width="1.6"/>
    <circle cx="8"  cy="12" r="1.6" fill="currentColor"/>
    <circle cx="12" cy="12" r="1.6" fill="currentColor"/>
    <circle cx="16" cy="12" r="1.6" fill="currentColor"/>
  </svg>`;
}

function iconProfileBiblical() {
  // Bust + small halo
  return `
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <circle cx="12" cy="7.8" r="3.1" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <path d="M5.5 18.5c1.6-3.2 4.2-4.6 6.5-4.6s4.9 1.4 6.5 4.6"
          fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <ellipse cx="12" cy="4.2" rx="3.6" ry="0.9" fill="none" stroke="currentColor" stroke-width="1.2"/>
  </svg>`;
}
