// src/pages/day.js

// UI pieces
import { renderHeader, initHeaderInteractions } from '../components/header.js';
import { openCreateSheet } from '../components/sheet.js';

// tiny effects/helpers
import { confetti, pulse } from '../utils/effects.js';

// date helpers
import { fmtDM, TODAY_KEY, keyOf } from '../utils/date.js';

/**
 * Optional: a tiny in-memory model for the demo day list.
 * Replace with your real data later.
 */
function getDemoTasks() {
  return [
    { id: 't1', text: 'דוגמה למשימה', time: '14:00' },
    { id: 't2', text: 'שיחה עם יעל', time: '16:30' },
  ];
}

function taskItemHTML(t) {
  return `
    <article class="p-daytask" data-id="${t.id}">
      <div class="p-daytask__text">${t.text}</div>
      <div class="p-daytask__time">${t.time}</div>
      <div class="p-daytask__actions">
        <button class="p-daytask__btn" data-act="done"  aria-label="בוצע">✔</button>
        <button class="p-daytask__btn" data-act="del"   aria-label="מחק">✖</button>
      </div>
    </article>
  `;
}

export function mount(root) {
  // header + meta
  const today = new Date();
  const todayDM = fmtDM(today); // e.g. 12.02

  root.innerHTML = `
    <main class="o-page">
      <section class="o-phone o-inner">
        ${renderHeader({ active: 'day' })}

        <div class="c-meta-block">
          <span class="c-title--date">היום • ${todayDM}</span>
          <p class="c-subtitle"><b>ברוך הבא</b> ללוז ✨</p>
        </div>

        <section class="p-dayview" id="dayList">
          ${getDemoTasks().map(taskItemHTML).join('')}
        </section>

        <div class="c-primary-cta">
          <button class="c-cta c-cta--bang btn-create-orb" aria-label="צור אירוע"></button>
        </div>
      </section>
    </main>
  `;

  // highlight "today" if your CSS uses today flags (optional)
  document.body.dataset.view = 'day';
  document.body.dataset.today = TODAY_KEY;

  // header interactions (menu/profile etc.)
  initHeaderInteractions();

  // open sheet when the orb is clicked (already delegated globally in main.js,
  // but this is a local safety net if you prefer local wiring)
  const orb = root.querySelector('.btn-create-orb');
  orb?.addEventListener('click', openCreateSheet);

  // delegate task actions
  const list = root.querySelector('#dayList');
  list?.addEventListener('click', (e) => {
    const btn = e.target.closest('.p-daytask__btn');
    if (!btn) return;

    const card = btn.closest('.p-daytask');
    const rect = btn.getBoundingClientRect();

    if (btn.dataset.act === 'done') {
      // tiny press feedback + confetti
      pulse(btn);
      confetti(rect.left + rect.width / 2, rect.top + rect.height / 2);

      // optional: strike-through, etc.
      card.classList.add('is-done');
    }

    if (btn.dataset.act === 'del') {
      // remove with a "scratch" animation (CSS class you already have)
      card.classList.add('is-scratching');
      setTimeout(() => card.remove(), 520);
    }
  });
}
