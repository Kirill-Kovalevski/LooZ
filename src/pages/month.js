// src/pages/month.js

import { renderHeader, initHeaderInteractions } from '../components/header.js';
import { openCreateSheet } from '../components/sheet.js';

// ✅ shared date helpers (single source of truth)
import { keyOf, TODAY_KEY } from '../utils/date.js';

/**
 * Build a simple month model: all dates for the current month.
 * (No padding cells yet — we can add leading/trailing days later if you want a
 * full calendar matrix. For now it mirrors the lightweight LooZ month grid.)
 */
function buildMonth(anchor = new Date()) {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const last = new Date(y, m + 1, 0);        // last day of month
  const days = [];
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(y, m, d));
  }
  return { year: y, month: m, days };
}

export function mount(root) {
  const { days } = buildMonth(new Date());

  root.innerHTML = `
    ${renderHeader({ active: 'month' })}

    <main class="o-page">
      <section class="o-phone o-inner">
        <div class="c-planner">
          <div class="p-month">
            ${days.map(d => {
              const todayClass = keyOf(d) === TODAY_KEY ? ' p-cell--today' : '';
              // data-date helps when you later attach real counts / click handlers
              return `
                <button class="p-cell${todayClass}" data-date="${keyOf(d)}" style="--ring-color:#cbd5e1">
                  <span class="p-cell__num">${d.getDate()}</span>
                  <span class="p-count">0</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="c-bottom-cta">
          <button class="c-cta c-cta--bang btn-create-orb" aria-label="צור אירוע"></button>
        </div>
      </section>
    </main>
  `;

  // header interactions (profile/menu etc.)
  initHeaderInteractions();

  // open the create-event sheet from the orb
  root.addEventListener('click', (e) => {
    if (e.target.closest('.btn-create-orb')) openCreateSheet();
  });
}
