import { dayNames, buildWeek, fmtDM, keyOf, TODAY_KEY } from '../components/date.js';

// ===== helpers (same as week.js) =====
function getWeekStart(){ return localStorage.getItem('weekStart') || 'sun'; }
function startIndex(){ return getWeekStart()==='mon' ? 1 : 0; }
function keyOf(d){ const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), da=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${da}`; }
const TODAY_KEY = keyOf(new Date());

// build cells for a calendar month respecting weekStart
function buildMonth(year, month /* 0=Jan */){
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const sIdx  = startIndex();          // 0 for Sun, 1 for Mon

  // JS getDay(): 0..6 with 0=Sun
  const jsFirst = first.getDay();
  const leadPads = ((jsFirst - sIdx) + 7) % 7;

  const daysIn = last.getDate();
  const cells = [];

  // leading pad cells
  for (let i=0; i<leadPads; i++) cells.push({ type:'pad' });

  // actual days
  for (let d=1; d<=daysIn; d++){
    const date = new Date(year, month, d);
    cells.push({
      type:'day',
      day: d,
      key: keyOf(date),
      count: (d % 5 === 0 ? 3 : 0),  // demo count
    });
  }

  // trailing pads to complete row
  while (cells.length % 7 !== 0) cells.push({ type:'pad' });

  return cells;
}

export function mount(root){
  const now = new Date();
  const cells = buildMonth(now.getFullYear(), now.getMonth());

  const html = cells.map(c => {
    if (c.type === 'pad'){
      return `<div class="p-cell p-cell--pad" aria-hidden="true"><span class="p-cell__num"></span></div>`;
    }
    const isToday = (c.key === TODAY_KEY);
    const clsToday = isToday ? ' p-cell--today' : '';
    return `
      <button class="p-cell${clsToday}" type="button" aria-label="יום ${c.day}">
        <span class="p-cell__num">${c.day}</span>
        ${c.count ? `<span class="p-count">${c.count}</span>` : ''}
      </button>
    `;
  }).join('');

  root.innerHTML = `
    <section class="p-month">
      ${html}
    </section>
  `;
}
