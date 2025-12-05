// /src/pages/day.js
// Day view — acts only on the item by id, archives via utils/events.

import {
  EVENTS_CHANGED,
  keyOf,
  getEventsByDate,
  completeEvent,
  trashEvent
} from '../utils/events.js';

import { fxConfetti, fxInkDelete, bumpTaskCounter } from '../utils/effects.js';

const HEB_DAYS = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const pad2 = n => String(n).padStart(2, '0');
const dayParts = d => ({
  dow: HEB_DAYS[d.getDay()],
  md: `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`
});

const escapeHTML = s =>
  String(s || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));

/* ---------- sub-task state in localStorage ---------- */

const SUB_LS_PREFIX = 'subtasks-';

function loadSubState(taskId) {
  try {
    const raw = localStorage.getItem(SUB_LS_PREFIX + taskId);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.map(x => Number(x)));
  } catch {
    return new Set();
  }
}

function saveSubState(taskId, set) {
  try {
    localStorage.setItem(
      SUB_LS_PREFIX + taskId,
      JSON.stringify(Array.from(set))
    );
  } catch {
    /* ignore */
  }
}

/* ---------- description heuristics ---------- */

/**
 * Decide whether description is a NOTE or a LIST of subtasks.
 *
 * Rules:
 *  - Empty  → "empty" (placeholder line, no bullets)
 *  - First line starts with "note:" / "הערה:" → NOTE
 *  - All non-empty lines start with bullet markers (-, •, *, 1., 2) → LIST
 *  - 1 line → NOTE
 *  - 2 short lines without sentence punctuation → LIST (mini subtasks)
 *  - 2+ lines with "sentence" feel (., !, ?) → NOTE
 *  - 3+ plain lines → LIST
 */
function classifyDescription(text) {
  const raw = (text || '').trim();
  if (!raw) return { kind: 'empty', lines: [] };

  const lines = raw
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  if (!lines.length) return { kind: 'empty', lines: [] };

  const firstLower = lines[0].toLowerCase();
  if (firstLower.startsWith('note:') || firstLower.startsWith('הערה:')) {
    // everything after "note:" / "הערה:" is a single note
    const rest = lines.slice(1);
    const noteText = rest.length
      ? rest.join(' ')
      : lines[0].replace(/^note:\s*|^הערה:\s*/i, '');
    return { kind: 'note', text: noteText.trim() };
  }

  const bulletPrefix = /^(\d+[\.\)]|[-*•·–])\s+/;

  const allHaveBulletPrefix = lines.every(l => bulletPrefix.test(l));
  if (allHaveBulletPrefix) {
    const clean = lines.map(l => l.replace(bulletPrefix, '').trim());
    return { kind: 'list', lines: clean };
  }

  if (lines.length === 1) {
    return { kind: 'note', text: lines[0] };
  }

  const hasSentenceFeel = lines.some(
    l => /[.!?…]/.test(l) || l.length > 80
  );

  if (lines.length >= 2 && hasSentenceFeel && lines.length <= 3) {
    // two–three "sentences" → treat as one note
    return { kind: 'note', text: lines.join(' ') };
  }

  if (lines.length >= 3) {
    // three or more short lines → subtasks
    return { kind: 'list', lines };
  }

  // default: small two-line list
  return { kind: 'list', lines };
}

/* ---------- subtask progress (for mini bar) ---------- */

function getSubtaskProgress(task) {
  const rawDesc = task.desc || task.description || '';
  const classification = classifyDescription(rawDesc);
  if (classification.kind !== 'list') return null;

  const total = classification.lines.length;
  if (!total) return null;

  const doneSet = loadSubState(task.id);
  let doneCount = 0;
  classification.lines.forEach((_, ix) => {
    if (doneSet.has(ix)) doneCount++;
  });

  const ratio = Math.max(0, Math.min(1, doneCount / total));
  return { total, doneCount, ratio };
}

/* ---------- description HTML ---------- */

function descHTML(task) {
  const id = task.id;
  const rawDesc = task.desc || task.description || '';

  const classification = classifyDescription(rawDesc);
  const subDone = loadSubState(id);

  if (classification.kind === 'empty') {
    return `
      <div class="p-desc p-desc--empty" dir="rtl" data-has-real="0">
        <span class="p-desc-placeholder">אין תיאור למשימה הזו (לא חובה)</span>
      </div>
    `;
  }

  if (classification.kind === 'note') {
    const txt = classification.text || rawDesc;
    return `
      <div class="p-desc p-desc--note" dir="rtl" data-has-real="1">
        <p>${escapeHTML(txt)}</p>
      </div>
    `;
  }

  // list of subtasks
  const items = classification.lines
    .map((line, ix) => {
      const done = subDone.has(ix);
      const klass = done ? 'p-subtask is-subdone' : 'p-subtask';
      const aria = done ? 'true' : 'false';
      return `<li class="${klass}" data-subtask data-ix="${ix}" aria-checked="${aria}">
                <span class="p-subtask__dot"></span>
                <span class="p-subtask__text">${escapeHTML(line)}</span>
              </li>`;
    })
    .join('');

  return `
    <div class="p-desc p-desc--list" dir="rtl" data-has-real="1">
      <ul class="p-desc-list">
        ${items}
      </ul>
    </div>
  `;
}

/* ---------- host + state ---------- */

function ensureHost(root) {
  let host =
    root.querySelector('#viewRoot') || document.getElementById('viewRoot');
  if (!host) {
    host = document.createElement('section');
    host.id = 'viewRoot';
    root.appendChild(host);
  }
  return host;
}

let state = {
  date: new Date(),
  cleanup: null
};

let boundClickHandler = null;

/* ---------- card template ---------- */

const cardHTML = (t) => {
  const progress = getSubtaskProgress(t);
  const barHTML = progress
    ? `
    <div class="p-subbar" aria-hidden="true">
      <div
        class="p-subbar__fill${progress.ratio >= 0.999 ? ' is-full' : ''}"
        style="--sub-ratio:${progress.ratio};">
      </div>
    </div>
  `
    : '';

  return `
    <article class="p-datask" data-task data-id="${t.id}">
      <div class="p-time" dir="ltr">${t.time || '—'}</div>
      <div class="p-body">
        <div class="p-title">${escapeHTML(t.title || 'ללא כותרת')}</div>
        ${barHTML}
      </div>
      <div class="p-actions">
        <button class="p-act p-act--ok" type="button" aria-label="בוצע">✓</button>
        <button class="p-act p-act--no" type="button" aria-label="מחק">✕</button>
      </div>
      ${descHTML(t)}
    </article>
  `;
};

const emptyHTML = `
  <article class="p-empty">
    אין משימות להיום. לחץ על הכפתור למטה כדי ליצור משימה חדשה.
  </article>
`;

/* ---------- progress bar updater (after click) ---------- */

function updateSubBarForCard(card, set) {
  const total = card.querySelectorAll('[data-subtask]').length;
  if (!total) return;

  const ratio = Math.max(0, Math.min(1, set.size / total));
  const fill = card.querySelector('.p-subbar__fill');
  if (!fill) return;

  fill.style.setProperty('--sub-ratio', ratio);
  fill.classList.toggle('is-full', ratio >= 0.999);
}

/* ---------- toggle a single sub-task ---------- */

function toggleSubtask(el, card) {
  const id = card.getAttribute('data-id');
  if (!id) return;
  const ix = Number(el.getAttribute('data-ix'));
  if (Number.isNaN(ix)) return;

  const set = loadSubState(id);
  if (set.has(ix)) set.delete(ix);
  else set.add(ix);
  saveSubState(id, set);

  el.classList.toggle('is-subdone', set.has(ix));
  el.setAttribute('aria-checked', set.has(ix) ? 'true' : 'false');

  updateSubBarForCard(card, set);
}

/* ---------- render ---------- */

function render(host) {
  const dateKey = keyOf(state.date);
  const items = getEventsByDate(dateKey);
  const { dow, md } = dayParts(state.date);

  host.innerHTML = `
    <section class="p-dayview" aria-label="רשימת משימות ליום">
      <header class="p-day-head">
        <div class="p-day-when" aria-live="polite">
          <span class="p-when__dow">${dow}</span>
          <span class="p-when__dot" aria-hidden="true">·</span>
          <span class="p-when__md">${md}</span>
        </div>
      </header>
      <div class="p-tasklist">
        ${items.length ? items.map(cardHTML).join('') : emptyHTML}
      </div>
    </section>
  `;

  if (!boundClickHandler) {
    boundClickHandler = async (e) => {
      const hostEl = e.currentTarget;
      const card = e.target.closest('[data-task]');
      if (!card || !hostEl.contains(card)) return;

      // 1) sub-task click (takes priority, no card toggle)
      const sub = e.target.closest('[data-subtask]');
      if (sub) {
        e.preventDefault();
        e.stopPropagation();
        toggleSubtask(sub, card);
        return;
      }

      // 2) ✓ / ✕ actions
      const ok = e.target.closest('.p-act--ok');
      const del = e.target.closest('.p-act--no');

      if (ok || del) {
        e.preventDefault();
        e.stopPropagation();

        const id = card.getAttribute('data-id');
        if (!id) return;

        if (ok) {
          fxConfetti(e.clientX, e.clientY, { count: 36, ms: 1200 });
          card.classList.add('fx-done');
          bumpTaskCounter?.(-1);
          setTimeout(() => {
            completeEvent(id);
          }, 440);
          return;
        }

        if (del) {
          await fxInkDelete(card);
          bumpTaskCounter?.(-1);
          setTimeout(() => {
            trashEvent(id);
          }, 0);
          return;
        }
      }

      // 3) tap on card body → toggle description open/closed
      card.classList.toggle('is-open');
    };

    host.addEventListener('click', boundClickHandler);
  }
}

/* ---------- lifecycle ---------- */

export function mount(root) {
  document.body.setAttribute('data-view', 'day');
  const host = ensureHost(root);

  try {
    const sel = localStorage.getItem('selectedDate');
    if (sel) state.date = new Date(sel);
  } catch {}

  render(host);

  const onPeriod = (e) => {
    const dir = e.detail;
    if (dir === 'prev') {
      state.date = new Date(
        state.date.getFullYear(),
        state.date.getMonth(),
        state.date.getDate() - 1
      );
    }
    if (dir === 'next') {
      state.date = new Date(
        state.date.getFullYear(),
        state.date.getMonth(),
        state.date.getDate() + 1
      );
    }
    if (dir === 'today') {
      state.date = new Date();
    }
    render(host);
  };

  const onEvents = () => render(host);

  state.cleanup?.();
  document.addEventListener('period-nav', onPeriod);
  document.addEventListener(EVENTS_CHANGED, onEvents);
  state.cleanup = () => {
    document.removeEventListener('period-nav', onPeriod);
    document.removeEventListener(EVENTS_CHANGED, onEvents);
    if (boundClickHandler) {
      host.removeEventListener('click', boundClickHandler);
      boundClickHandler = null;
    }
  };
}
