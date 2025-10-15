// src/pages/home.js
import { openCreateSheet } from '../components/sheet.js';

/* ----------------- small helpers ----------------- */
function hebrewDayName(d){
  return ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][d.getDay()];
}
function fmtDM(d){
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  return `${dd}.${mm}`;
}
function addDays(d,n){ const x=new Date(d); x.setDate(d.getDate()+n); return x; }
function addMonths(d,n){ const x=new Date(d); x.setMonth(d.getMonth()+n); return x; }
function getFirstName(){ try{ return localStorage.getItem('firstName') || ''; }catch{ return ''; } }

/* mode label shown under the "היום" button */
const MODE_LABELS = { day:'יום', week:'שבוע', month:'חודש' };

// local state (for later when you plug in the real views)
let mode   = 'day';          // 'day' | 'week' | 'month'
let anchor = new Date();     // current date the user is “on”

export function mount(root){
  const today = new Date();

  // page chrome (top + bottom only)
  root.innerHTML = `
    <main class="o-page" data-view="home">
      <section class="o-phone o-inner">

        <!-- top bar: settings (left), lemon brand centered, profile (right) -->
        <header class="o-header o-header--edge">
          <a href="#/settings" class="c-topbtn" aria-label="הגדרות">⚙️</a>

          <div class="c-lemon-brand" aria-label="LooZ">
            <span class="c-lemon-brand__line"></span>
            <!-- Put your lemon icon file in /icons (see notes below) -->
            <img class="c-lemon-brand__logo" alt="Lemon" src="/icons/lemon.png">
          </div>

          <button class="c-topbtn" id="btnProfile" aria-label="פרופיל">👤</button>
        </header>

        <!-- greeting + today's date (always today's date; pager won’t change it) -->
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

        <!-- mode switch: only changes the current “mode”, not the whole page -->
        <nav class="c-switch" role="tablist" aria-label="תצוגה">
          <button class="c-pill" data-switch="day"   role="tab" aria-selected="true">יום</button>
          <button class="c-pill" data-switch="week"  role="tab">שבוע</button>
          <button class="c-pill" data-switch="month" role="tab">חודש</button>
        </nav>

        <!-- three-part nav bar (prev / TODAY / next) -->
        <nav class="c-triple" aria-label="ניווט זמן">
          <button class="c-triple__btn" data-page="prev" aria-label="הקודם">‹</button>

          <div class="c-triple__center">
            <button class="c-today" id="btnToday" aria-label="חזור להיום">היום</button>
            <span class="c-mode-pill" id="modePill">${MODE_LABELS[mode]}</span>
          </div>

          <button class="c-triple__btn" data-page="next" aria-label="הבא">›</button>
        </nav>

        <!-- bottom create-event orb -->
        <div class="c-bottom-cta">
          <button class="c-cta c-cta--bang btn-create-orb" aria-label="צור אירוע"></button>
        </div>

      </section>
    </main>
  `;

  /* interactions */
  // mode switch (updates the small pill text)
  root.querySelectorAll('[data-switch]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      mode = e.currentTarget.dataset.switch;
      root.querySelectorAll('[data-switch]').forEach(b=>b.setAttribute('aria-selected', String(b===e.currentTarget)));
      const pill = root.querySelector('#modePill');
      if (pill) pill.textContent = MODE_LABELS[mode];
    });
  });

  // the three-part pager (prev/next jump the anchor by mode)
  root.querySelector('.c-triple').addEventListener('click', (e)=>{
    const dir = e.target.closest('[data-page]')?.dataset.page;
    if (!dir) return;
    const step = dir === 'prev' ? -1 : +1;
    if (mode === 'day')   anchor = addDays(anchor, step);
    if (mode === 'week')  anchor = addDays(anchor, step*7);
    if (mode === 'month') anchor = addMonths(anchor, step);
    // You’ll use "anchor" later to render the correct range.
  });

  // “Today” brings anchor back to the real today
  root.querySelector('#btnToday').addEventListener('click', ()=>{
    anchor = new Date();
    // anchor set back to today, mode stays as the user picked (day/week/month)
  });

  // open the create sheet
  root.addEventListener('click', (e)=>{
    if (e.target.closest('.btn-create-orb')) openCreateSheet();
  });
}
