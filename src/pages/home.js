// src/pages/home.js
import { openCreateSheet } from '../components/sheet.js';
import {
  dayNames, buildWeek, fmtDM, keyOf, TODAY_KEY,
} from '../utils/date.js';

// simple state local to this view
let mode = 'day';              // 'day' | 'week' | 'month'
let anchor = new Date();       // what the view is centered on

export function mount(root){
  const today = new Date();

  // --- header + greeting stays fixed; only #viewArea changes ---
  root.innerHTML = `
    <main class="o-page" data-view="home">
      <section class="o-phone o-inner">

        <!-- Top icons on each edge -->
        <header class="o-header o-header--edge">
          <button class="c-topbtn" id="btnMenu" aria-label="תפריט">☰</button>

          <div class="c-lemon-brand" aria-label="LooZ">
            <span class="c-lemon-brand__line"></span>
            <img class="c-lemon-brand__logo" alt="LooZ" src="/src/assets/logo-light.png">
          </div>

          <button class="c-topbtn" id="btnProfile" aria-label="פרופיל">👤</button>
        </header>

        <!-- Greeting + date -->
        <div class="c-greet">
          <div class="c-greet__today">
            <b>${hebrewDayName(today)}</b>
            <span class="c-greet__date">${fmtDM(today)}</span>
          </div>
          <p class="c-greet__line">
            <b>שלום,</b> <span id="greetName">${getFirstName() || 'אורח'}</span> 👋
          </p>
          <p class="c-greet__special" data-special="off"></p>
        </div>

        <!-- Switch controls (these only change the lower view area) -->
        <nav class="c-switch" role="tablist" aria-label="תצוגה">
          <button class="c-pill" data-switch="day"   role="tab" aria-selected="true">יום</button>
          <button class="c-pill" data-switch="week"  role="tab">שבוע</button>
          <button class="c-pill" data-switch="month" role="tab">חודש</button>
          <a class="c-pill" href="#/settings" role="tab">הגדרות</a>
        </nav>

        <!-- This is the part that changes -->
        <section id="viewArea" class="l-viewarea" aria-live="polite"></section>

        <!-- Prev/Next pager (fixed, small) -->
        <nav class="c-pager" aria-label="דפדוף">
          <button class="c-pager__btn" data-page="prev" aria-label="הקודם">‹</button>
          <button class="c-pager__btn" data-page="next" aria-label="הבא">›</button>
        </nav>

        <!-- Create-event orb (fixed at bottom) -->
        <div class="c-bottom-cta">
          <button class="c-cta c-cta--bang btn-create-orb" aria-label="צור אירוע"></button>
        </div>

      </section>
    </main>
  `;

  // initial render of lower area
  renderLower();

  // switches
  root.querySelectorAll('[data-switch]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      mode = e.currentTarget.dataset.switch;
      // aria-selected update
      root.querySelectorAll('[data-switch]').forEach(b=>b.setAttribute('aria-selected', String(b===e.currentTarget)));
      renderLower();
    });
  });

  // pager prev/next (moves by day|week|month depending on mode)
  root.querySelector('.c-pager').addEventListener('click', (e)=>{
    const dir = e.target.closest('[data-page]')?.dataset.page;
    if (!dir) return;
    const step = dir === 'prev' ? -1 : +1;
    if (mode === 'day')   anchor = addDays(anchor, step);
    if (mode === 'week')  anchor = addDays(anchor, step*7);
    if (mode === 'month') anchor = addMonths(anchor, step);
    renderLower();
  });

  // open sheet from the orb
  root.addEventListener('click', (e)=>{
    if (e.target.closest('.btn-create-orb')) openCreateSheet();
  });
}

/* ----------------- RENDERERS FOR LOWER AREA ------------------ */
function renderLower(){
  const host = document.getElementById('viewArea');
  if (!host) return;

  if (mode === 'day')  host.innerHTML = renderDay(anchor);
  if (mode === 'week') host.innerHTML = renderWeek(anchor);
  if (mode === 'month')host.innerHTML = renderMonth(anchor);
}

/* Day view: very light placeholder */
function renderDay(d){
  const isToday = keyOf(d) === TODAY_KEY;
  return `
    <article class="p-dayview">
      <header class="p-dayview__head">
        <h2 class="p-title">${hebrewDayName(d)} <small>${fmtDM(d)}</small></h2>
      </header>
      <div class="p-dayview__list">
        <div class="p-task${isToday?' p-task--today':''}">
          <div class="p-task__text">דוגמה למשימה</div>
          <div class="p-task__time">14:00</div>
          <div class="p-task__actions">
            <button class="p-task__btn">✔</button>
            <button class="p-task__btn">✖</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

/* Week view: 7 rows with counter in the middle */
function renderWeek(anchorDate){
  const w = buildWeek(anchorDate, weekStartsOn());
  const heb = dayNames();
  return `
    <section class="p-week">
      ${w.days.map((d,i)=>{
        const today = keyOf(d) === TODAY_KEY ? ' is-today' : '';
        return `
          <div class="p-week__row${today}">
            <div class="p-week__name">${heb[i]}</div>
            <div class="p-week__count">0</div>
            <div class="p-week__dm">${fmtDM(d)}</div>
          </div>
        `;
      }).join('')}
    </section>
  `;
}

/* Month view: simple calendar grid for the month of anchor */
function renderMonth(anchorDate){
  const y = anchorDate.getFullYear();
  const m = anchorDate.getMonth();
  const first = new Date(y,m,1);
  const last  = new Date(y,m+1,0);

  // (keep it simple; no leading/trailing days)
  const cells = [];
  for (let d=1; d<=last.getDate(); d++){
    const dt = new Date(y,m,d);
    const today = keyOf(dt) === TODAY_KEY ? ' p-cell--today' : '';
    cells.push(`
      <button class="p-cell${today}" data-date="${keyOf(dt)}">
        <span class="p-cell__num">${d}</span>
        <span class="p-count">0</span>
      </button>
    `);
  }

  return `
    <section class="p-month">
      <div class="p-month__grid">${cells.join('')}</div>
    </section>
  `;
}

/* ----------------- SMALL HELPERS ------------------ */
function hebrewDayName(d){
  return ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][d.getDay()];
}
function addDays(d,n){ const x=new Date(d); x.setDate(d.getDate()+n); return x; }
function addMonths(d,n){ const x=new Date(d); x.setMonth(d.getMonth()+n); return x; }
function weekStartsOn(){ return (localStorage.getItem('weekStart')==='mon') ? 1 : 0; }
function getFirstName(){ try{ return localStorage.getItem('firstName') || ''; }catch{ return ''; } }
