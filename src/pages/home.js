// src/pages/home.js
import { openCreateSheet } from '../components/sheet.js';
import { dayNames, buildWeek, fmtDM, keyOf, TODAY_KEY } from '../utils/date.js';

/* -------------------------------------------------
   Tiny helpers
--------------------------------------------------*/
const MODE = { day: 'day', week: 'week', month: 'month' };
const MODE_LABELS = { day: 'יום', week: 'שבוע', month: 'חודש' };

const HEB_DAYS_FULL = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

const addDays = (d, n) => { const x = new Date(d); x.setDate(d.getDate()+n); return x; };
const addMonths = (d, n) => { const x = new Date(d); x.setMonth(d.getMonth()+n); return x; };

const getFirstName = () => {
  try { return localStorage.getItem('firstName') || 'אורח'; } catch { return 'אורח'; }
};

/* -------------------------------------------------
   Page state (week/month content uses "anchor")
--------------------------------------------------*/
let mode   = MODE.day;         // default “יום”
let anchor = new Date();       // what the arrows move

/* -------------------------------------------------
   Renderers for the lower content area
--------------------------------------------------*/
function renderDay(container, date) {
  // Demo content: one “fake” task card for the selected day
  const isToday = keyOf(date) === TODAY_KEY;
  container.innerHTML = `
    <section class="p-dayview">
      <div class="p-dayview__head">
        <div class="p-dayview__left"></div>
        <h2 class="p-dayview__title">
          ${HEB_DAYS_FULL[date.getDay()]}
          <small>${fmtDM(date)}</small>
          ${isToday ? '<em class="p-chip p-chip--today">היום</em>' : ''}
        </h2>
        <div class="p-dayview__right"></div>
      </div>

      <article class="p-task">
        <div class="p-task__text">דוגמה למשימה</div>
        <div class="p-task__time">14:00</div>
        <div class="p-task__actions">
          <button class="p-task__btn p-task__btn--ok" title="סימון">✔</button>
          <button class="p-task__btn p-task__btn--del" title="מחיקה">✖</button>
        </div>
      </article>
    </section>
  `;
}

function renderWeek(container, date) {
  const { days } = buildWeek(date);
  const heb = dayNames('he'); // your util already respects week-start pref
  container.innerHTML = `
    <section class="p-week">
      ${days.map((d, i) => {
        const today = keyOf(d) === TODAY_KEY ? ' is-today' : '';
        return `
          <div class="p-week__row${today}">
            <div class="p-week__col p-week__col--name">${heb[i]}</div>
            <div class="p-week__col p-week__col--count"><span class="p-count">0</span></div>
            <div class="p-week__col p-week__col--date">${fmtDM(d)}</div>
          </div>
        `;
      }).join('')}
    </section>
  `;
}

function renderMonth(container, date) {
  // Simple month grid 1..N
  const y = date.getFullYear(), m = date.getMonth();
  const last = new Date(y, m+1, 0).getDate();
  const days = Array.from({ length: last }, (_,i)=> new Date(y,m,i+1));
  container.innerHTML = `
    <section class="p-month">
      ${days.map(d=>{
        const isToday = keyOf(d)===TODAY_KEY ? ' p-cell--today' : '';
        return `
          <button class="p-cell${isToday}" data-date="${keyOf(d)}">
            <span class="p-cell__num">${d.getDate()}</span>
            <span class="p-count">0</span>
          </button>
        `;
      }).join('')}
    </section>
  `;
}

/* -------------------------------------------------
   Main Home mount
--------------------------------------------------*/
export function mount(root){
  const today = new Date();

  root.innerHTML = `
    <main class="o-page" data-view="home">
      <section class="o-phone o-inner">

        <!-- HEADER: profile (left) | centered logo | settings (right) -->
        <header class="o-header o-header--edge">
          <!-- Biblical/mythical inspired placeholders; swap to SVGs when ready -->
          <button class="c-topbtn c-topbtn--profile" aria-label="פרופיל" title="פרופיל">🕊️</button>

          <a class="c-looz-brand" href="#/home" aria-label="LooZ">
            <img class="c-looz-logo c-looz-logo--light" alt="LooZ" src="/src/icons/main-logo.png">
            <img class="c-looz-logo c-looz-logo--dark"  alt="LooZ" src="/src/icons/dark-logo.png">
          </a>

          <a href="#/settings" class="c-topbtn c-topbtn--settings" aria-label="הגדרות" title="הגדרות">🔱</a>
        </header>

        <!-- Greeting block -->
        <div class="c-greet">
          <div class="c-greet__today">
            <b>${HEB_DAYS_FULL[today.getDay()]}</b>
            <span class="c-greet__date">${fmtDM(today)}</span>
          </div>
          <p class="c-greet__line"><b>שלום,</b> <span id="greetName">${getFirstName()}</span> 👋</p>
          <p class="c-greet__special" data-special="off"></p>
        </div>

        <!-- Mode switch -->
        <nav class="c-switch" role="tablist" aria-label="תצוגה">
          <button class="c-pill" data-switch="day"   role="tab" aria-selected="true">יום</button>
          <button class="c-pill" data-switch="week"  role="tab">שבוע</button>
          <button class="c-pill" data-switch="month" role="tab">חודש</button>
        </nav>

        <!-- Pager (prev | היום+mode | next) -->
        <nav class="c-triple" aria-label="ניווט זמן">
          <button class="c-triple__btn" data-page="prev" aria-label="הקודם">‹</button>
          <div class="c-triple__center">
            <button class="c-today" id="btnToday" aria-label="חזור להיום">היום</button>
            <span class="c-mode-pill" id="modePill">${MODE_LABELS[mode]}</span>
          </div>
          <button class="c-triple__btn" data-page="next" aria-label="הבא">›</button>
        </nav>

        <!-- LOWER CONTENT AREA (actually rendered now) -->
        <div id="viewArea" class="o-viewarea" aria-live="polite"></div>

        <!-- Create-event orb, fixed and truly centered -->
        <div class="c-bottom-cta">
          <button class="c-cta c-cta--bang btn-create-orb" aria-label="צור אירוע"></button>
        </div>

      </section>
    </main>
  `;

  const viewArea = root.querySelector('#viewArea');
  const repaint  = () => {
    if (mode === MODE.day)   renderDay(viewArea, anchor);
    if (mode === MODE.week)  renderWeek(viewArea, anchor);
    if (mode === MODE.month) renderMonth(viewArea, anchor);
  };

  // Initial paint
  repaint();

  // Mode switching
  root.querySelectorAll('[data-switch]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      mode = e.currentTarget.dataset.switch;
      // ARIA
      root.querySelectorAll('[data-switch]').forEach(b=>b.setAttribute('aria-selected', String(b===e.currentTarget)));
      // Update label under "היום"
      root.querySelector('#modePill').textContent = MODE_LABELS[mode];
      repaint();
    });
  });

  // Prev/Next (step by mode)
  root.querySelector('.c-triple').addEventListener('click', (e)=>{
    const dir = e.target.closest('[data-page]')?.dataset.page;
    if (!dir) return;
    const step = dir === 'prev' ? -1 : +1;
    if (mode === MODE.day)   anchor = addDays(anchor, step);
    if (mode === MODE.week)  anchor = addDays(anchor, step*7);
    if (mode === MODE.month) anchor = addMonths(anchor, step);
    repaint();
  });

  // Back to real today (keeps mode)
  root.querySelector('#btnToday').addEventListener('click', ()=>{
    anchor = new Date();
    repaint();
  });

  // Open create sheet
  root.addEventListener('click', (e)=>{
    if (e.target.closest('.btn-create-orb')) openCreateSheet();
  });
}
