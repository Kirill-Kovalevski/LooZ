
import { dayNames, buildWeek, fmtDM, keyOf, TODAY_KEY } from '../utils/date.js';
import { renderHeader, initHeaderInteractions } from '../components/header.js';
import { openCreateSheet } from '../components/sheet.js';
import { dayNames, buildWeek, fmtDM, keyOf, TODAY_KEY } from '../components/date.js';

export function mount(root){
  root.innerHTML = `
    ${renderHeader()}
    <section class="o-inner p-week" id="weekHost"></section>
    <div class="c-primary-cta">
      <button class="c-cta c-cta--bang btn-create-orb" aria-label="צור אירוע"></button>
    </div>
  `;
  initHeaderInteractions();
  root.querySelector('.btn-create-orb')?.addEventListener('click', openCreateSheet);

  const names = dayNames('he');
  const days  = buildWeek(new Date());

  const html = days.map((d, i)=>{
    const isToday = keyOf(d) === TODAY_KEY;
    const cls = isToday ? ' p-day--today' : '';
    const count = (d.getDate() % 4); // demo
    return `
      <article class="p-day${cls}">
        <div class="w-row">
          <div class="w-day">${names[i]}</div>
          <div class="w-count" aria-label="ספירת משימות">${count}</div>
          <div class="w-date">${fmtDM(d)}</div>
        </div>
      </article>
    `;
  }).join('');

  root.querySelector('#weekHost').innerHTML = html;
}

// ===== helpers (see section above) =====
function getWeekStart(){ return localStorage.getItem('weekStart') || 'sun'; }
function setWeekStart(v){ localStorage.setItem('weekStart', v); }
const HEB_DAYS_SUN = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const HEB_DAYS_MON = ['ב׳','ג׳','ד׳','ה׳','ו׳','ש׳','א׳'];
function dayNames(){ return getWeekStart()==='mon' ? HEB_DAYS_MON : HEB_DAYS_SUN; }
function fmtDM(d){ const dd=String(d.getDate()).padStart(2,'0'); const mm=String(d.getMonth()+1).padStart(2,'0'); return `${dd}.${mm}`; }
function keyOf(d){ const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; }
const TODAY_KEY = keyOf(new Date());
function startIndex(){ return getWeekStart()==='mon' ? 1 : 0; }

// build array of 7 Date objects for the visible week that contains "ref"
function buildWeek(ref){
  const sIdx = startIndex();                // 0 for Sun, 1 for Mon
  const d = new Date(ref);
  // shift back to the start of week according to preference
  const jsIdx = d.getDay();                 // 0..6 (Sun..Sat)
  const delta = ((jsIdx - sIdx) + 7) % 7;   // how many days to go back
  d.setDate(d.getDate() - delta);

  const arr = [];
  for (let i=0; i<7; i++){
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    arr.push(day);
  }
  return arr;
}

export function mount(root){
  const names = dayNames();
  const days  = buildWeek(new Date());

  // demo count function
  const band = n => n<=0?0 : n===1?1 : n===2?2 : n<=4?3 : 4;

  const cards = days.map((date, idx) => {
    const key = keyOf(date);
    const isToday = (key === TODAY_KEY);
    const clsToday = isToday ? ' p-day--today' : '';
    const name = names[idx];        // Hebrew label according to weekStart
    const fakeCount = (date.getDate() % 4); // demo counts 0..3

    return `
      <article class="p-day${clsToday}">
        <div class="p-day__head">
          <h3 class="p-day__name">${name}</h3>
          <span class="p-day__count" data-band="${band(fakeCount)}">${fakeCount}</span>
          <time class="p-day__date">${fmtDM(date)}</time>
        </div>

        <div class="p-task">
          <div class="p-task__text">דוגמה למשימה</div>
          <div class="p-task__time">14:00</div>
          <div class="p-task__actions">
            <button class="p-task__btn">✔</button>
            <button class="p-task__btn">✖</button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  root.innerHTML = `
    <section class="p-week">
      ${cards}
    </section>
  `;
}