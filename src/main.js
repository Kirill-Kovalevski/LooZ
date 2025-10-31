// /src/main.js
// Boot the app through the router (no eager Home mount) so login can render cleanly.

import './core/firebase.js';                 // initializes Firebase once
import { initAuthWatcher } from './utils/authWatcher.js';
initAuthWatcher();

import './styles/main.scss';

// Theme – same behavior you had
import { getTheme, applyTheme, initThemeListeners } from './utils/theme.js';
applyTheme(getTheme());
initThemeListeners();

// Route-driven mounting (lets router decide: login/home/etc.)
import { startRouter } from './router.js';
startRouter();

// Global sheet handlers (preserved)
import { openCreateSheet, closeCreateSheet } from './components/sheet.js';
document.addEventListener('click', (e) => {
  if (e.target.closest('.btn-create-orb')) openCreateSheet();
  if (e.target.closest('[data-sheet="close"]')) closeCreateSheet();
});
