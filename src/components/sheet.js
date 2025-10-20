// src/components/sheet.js
// Hybrid adapter: try new modal; if unavailable, fall back to legacy sheet UI.

import { addEvent, keyOf, hhmm } from '../utils/events.js';

// ---- Try the new modal lazily (so missing file/exports won't crash at load) ----
async function tryOpenNewModal(date) {
  try {
    const mod = await import('./create.js' /* @vite-ignore */);
    const openCreateModal = mod.openCreateModal || mod.default;
    if (typeof openCreateModal === 'function') {
      openCreateModal(date);
      return true;
    }
  } catch (err) {
    // console.warn('New modal not available, using legacy sheet.', err);
  }
  return false;
}

async function tryCloseNewModal() {
  try {
    const mod = await import('./create.js' /* @vite-ignore */);
    if (typeof mod.closeCreateModal === 'function') {
      mod.closeCreateModal();
      return true;
    }
  } catch (_err) {}
  return false;
}

// ---- Public API (keeps legacy signature) ----
export async function openCreateSheet(opts = {}) {
  // 1) Prefer the new modal if present
  const wantedDate = typeof opts === 'string' ? opts : opts?.date;
  if (await tryOpenNewModal(wantedDate)) return;

  // 2) Legacy fallback (your original implementation)
  let wrap = document.querySelector('.c-sheet');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'c-sheet u-hidden';
    wrap.setAttribute('data-legacy', '1'); // mark legacy so we can clean it later if needed
    wrap.innerHTML = `
      <div class="c-sheet__backdrop" data-sheet="close"></div>

      <section class="c-sheet__panel" role="dialog" aria-modal="true" aria-label="צור אירוע">
        <header class="c-sheet__header">
          <h3 class="c-sheet__title">אירוע חדש</h3>
          <button class="c-icon-btn--ghost" data-sheet="close" aria-label="סגור">✕</button>
        </header>

        <form class="f-grid" id="newEventForm" novalidate>
          <label class="f-field f-field--elevated">
            <span class="f-label">תיאור</span>
            <input id="eventTitle" class="f-input f-input--big" name="title"
                   maxlength="80" placeholder="מה לעשות?" required>
          </label>

          <label class="f-field f-field--elevated">
            <span class="f-label">תאריך</span>
            <input id="eventDate" class="f-input" type="date" name="date" required>
          </label>

          <label class="f-field f-field--elevated">
            <span class="f-label">שעה</span>
            <input id="eventTime" class="f-input" type="time" name="time" required>
          </label>
        </form>

        <div class="c-sheet__actions">
          <button class="c-btn c-btn--ghost" data-sheet="close">ביטול</button>
          <button id="evtSave" class="c-btn c-btn--primary">שמור</button>
        </div>
      </section>
    `;
    document.body.appendChild(wrap);

    // close interactions
    wrap.addEventListener('click', (e) => {
      if (e.target.closest('[data-sheet="close"]')) closeCreateSheet();
    });

    // save handler -> addEvent(...) then close/reset
    const form = wrap.querySelector('#newEventForm');

    // set defaults (use provided date if any)
    const base = wantedDate ? new Date(wantedDate) : new Date();
    form.querySelector('#eventDate').value = keyOf(base);
    form.querySelector('#eventTime').value = hhmm(new Date());

    wrap.querySelector('#evtSave')?.addEventListener('click', () => {
      if (!form.reportValidity()) return;

      const data = Object.fromEntries(new FormData(form).entries());
      const dk = data.date || keyOf(new Date());
      const tm = data.time || '00:00';
      const tl = (data.title || '').trim() || 'ללא כותרת';

      addEvent({ date: dk, time: tm, title: tl, done: false });

      // reset defaults for the next open
      form.reset();
      const again = new Date();
      form.querySelector('#eventDate').value = keyOf(again);
      form.querySelector('#eventTime').value = hhmm(again);

      closeCreateSheet();
    });
  }

  requestAnimationFrame(() => {
    wrap.classList.remove('u-hidden');
    wrap.classList.add('is-open');
  });
}

export async function closeCreateSheet() {
  // 1) Try to close the new modal if it’s the one open
  if (await tryCloseNewModal()) return;

  // 2) Otherwise close the legacy sheet if present
  const wrap = document.querySelector('.c-sheet');
  if (!wrap) return;
  wrap.classList.remove('is-open');
  setTimeout(() => wrap.classList.add('u-hidden'), 280);
}
