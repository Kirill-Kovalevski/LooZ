// src/main.js
import './styles/main.scss';
import { initRouter } from './router.js';
import { openCreateSheet, closeCreateSheet } from './components/sheet.js';

initRouter();

// optional global delegation
document.addEventListener('click', (e) => {
  if (e.target.closest('.btn-create-orb')) openCreateSheet();
  if (e.target.closest('[data-sheet="close"]')) closeCreateSheet();
});
