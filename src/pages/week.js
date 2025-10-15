// src/pages/week.js
import { renderHeader, initHeaderInteractions } from '../components/header.js';
import { openCreateSheet } from '../components/sheet.js';

// ✅ shared date helpers (single source of truth)
import { dayNames, buildWeek, fmtDM, keyOf, TODAY_KEY } from '../utils/date.js';

export function mount(root) {
  // Build the model for the current week (respects week-start preference)
  // Expecting buildWeek(new Date()) -> [{ date, key, isToday }, ... 7 items]
  const model = buildWeek(new Date());
  const names = dayNames(); // ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'] (or Mon-first if selected)

  root.innerHTML = `
    ${renderHeader({ active: 'week' })}

    <section class="o-inner c-planner">
      <div class="p-week">
        ${model
          .map((d, i) => {
            const key = d.key ?? keyOf(d.date);
            const isToday = (d.isToday ?? (key === TODAY_KEY)) ? ' is-today' : '';
            return `
              <article class="p-weekrow${isToday}" data-date="${key}">
                <div class="p-weekrow__name" aria-label="יום">${names[i]}</div>
                <div class="p-weekrow__count" aria-label="מספר משימות">
                  <span class="p-count">0</span>
                </div>
                <div class="p-weekrow__date" aria-label="תאריך">${fmtDM(d.date)}</div>
              </article>
            `;
          })
          .join('')}
      </div>
    </section>

    <!-- fixed bottom orb (create new event) -->
    <div class="c-bottom-cta">
      <button class="c-cta c-cta--bang btn-create-orb" aria-label="צור אירוע"></button>
    </div>
  `;

  // Header interactions (theme toggle, week-start control, etc.)
  initHeaderInteractions();

  // Open the create sheet from the orb (delegated to the view root)
  root.addEventListener('click', (e) => {
    if (e.target.closest('.btn-create-orb')) openCreateSheet();
  });
}
