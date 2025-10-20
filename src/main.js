import './styles/main.scss';
import { mount as mountHome } from './pages/home.js';
import { startRouter } from './router.js';
import { openCreateSheet, closeCreateSheet } from './components/sheet.js';
import { getTheme, applyTheme, initThemeListeners } from './utils/theme.js';

// Ensure the DOM reflects the stored/system theme after Vite mounts
applyTheme(getTheme());
initThemeListeners();

const app = document.getElementById('app');
mountHome(app);         // paint the shell once
startRouter(app);       // router will swap views INSIDE #viewRoot only

document.addEventListener('click', (e) => {
  if (e.target.closest('.btn-create-orb')) openCreateSheet();
  if (e.target.closest('[data-sheet="close"]')) closeCreateSheet();
});
