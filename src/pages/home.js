// src/pages/home.js
// Shell: header + lemon + date + greeting + view buttons (day|week|month)
// + mini period nav + #viewRoot + bottom orb. Views render INSIDE #viewRoot.

// ---------- tiny helpers ----------
const HEB_DAYS = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const pad2 = n => String(n).padStart(2, '0');
const todayDM = d => `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}`;
const hebDay  = d => HEB_DAYS[d.getDay()];

function getUserName() {
  const first = localStorage.getItem('firstName') || 'אורח';
  const last  = localStorage.getItem('lastName')  || '';
  return last ? `${first} ${last[0]}.` : first;
}

// ---------- view mounting (single function; no duplicates) ----------
const app = document.getElementById('app'); // the whole app root

async function renderView(view /* 'day' | 'week' | 'month' */) {
  const mod = await import(`./${view}.js`);
  mod.mount(app);             // each view renders into #viewRoot inside the shell
  setActive(view);            // update active state on the 3 buttons
}

// mark the active head button (yellow)
function setActive(view) {
  const map = {
    day:   document.querySelector('[data-viewbtn="day"]'),
    week:  document.querySelector('[data-viewbtn="week"]'),
    month: document.querySelector('[data-viewbtn="month"]'),
  };
  Object.entries(map).forEach(([k, btn]) => {
    if (!btn) return;
    const on = k === view;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', String(on));
  });
}

// broadcast period navigation to current view
function navPeriod(dir /* 'prev' | 'next' | 'today' */) {
  document.dispatchEvent(new CustomEvent('period-nav', { detail: dir }));
}

// ---------- shell html ----------
function shellHTML() {
  const d = new Date();
  const dateStr = `${hebDay(d)} ${todayDM(d)}`;

  return `
    <main class="o-page">
      <section class="o-phone o-inner">

        <!-- header: profile / centered logo / settings -->
        <header class="o-header">
          <button class="c-topbtn c-topbtn--profile" aria-label="פרופיל" title="פרופיל">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5Z" fill="currentColor"/>
            </svg>
          </button>

          <a class="looz-logo" aria-label="LooZ">
            <img class="brand-logo brand-logo--light" src="/src/icons/main-logo.png" alt="LooZ">
            <img class="brand-logo brand-logo--dark"  src="/src/icons/dark-logo.png"  alt="LooZ">
          </a>

          <button class="c-topbtn c-topbtn--settings" aria-label="הגדרות" title="הגדרות">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M5 12a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm7 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm7 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" fill="currentColor"/>
            </svg>
          </button>
        </header>

        <!-- lemon -->
        <div class="c-lemon-wrap">
          <button id="lemonToggle" class="c-icon-btn c-icon-btn--lemon" type="button"
                  aria-label="פתח/סגור תפריט" aria-expanded="false">
            <svg class="lemon-svg" viewBox="0 0 24 24" aria-hidden="true">
              <defs>
                <radialGradient id="lemBody" cx="50%" cy="42%" r="75%">
                  <stop offset="0%"  stop-color="#FFF6B8"/>
                  <stop offset="48%" stop-color="#FFE067"/>
                  <stop offset="100%" stop-color="#F7C843"/>
                </radialGradient>
              </defs>
              <g transform="translate(0,0) scale(1.05)">
                <path d="M19 7c-3-3-8-3-11 0-2 2.3-2 6 0 8 2.2 2.1 5.8 2.4 8 0 2.2-2.1 2.6-5.4 1-7.6"
                      fill="url(#lemBody)" stroke="#B8860B" stroke-width="1.8" stroke-linejoin="round"/>
                <path d="M18 6c.9-.9 1.7-1.8 2.3-2.8" stroke="#2E7D32" stroke-linecap="round" stroke-width="2"/>
              </g>
            </svg>
          </button>
        </div>

        <!-- date + greeting -->
        <div class="c-meta-block">
          <div class="c-date">${dateStr}</div>
          <p class="c-greet">ברוכים השבים <b>${getUserName()}</b> 👋</p>
        </div>

        <!-- view switch (order: day, week, month) -->
        <nav class="c-view-switch" aria-label="תצוגה">
          <button class="c-headbtn" data-viewbtn="day"   aria-pressed="false">יום</button>
          <button class="c-headbtn" data-viewbtn="week"  aria-pressed="false">שבוע</button>
          <button class="c-headbtn" data-viewbtn="month" aria-pressed="false">חודש</button>
        </nav>

        <!-- mini period nav (spreads to the edges via CSS) -->
        <div class="c-period-mini">
          <button class="c-pillnav" data-prev  aria-label="קודם">‹</button>
          <button class="c-pillnav c-pillnav--today" data-today aria-label="היום">היום</button>
          <button class="c-pillnav" data-next  aria-label="הבא">›</button>
        </div>

        <!-- content slot (views render here) -->
        <section id="viewRoot" class="o-viewroot" aria-live="polite"></section>

        <!-- bottom orb -->
        <div class="c-bottom-cta">
          <button class="c-cta c-cta--bang btn-create-orb" aria-label="צור אירוע"></button>
        </div>
      </section>
    </main>
  `;
}

// ---------- wire shell ----------
function wireShell(root) {
  // view switch
  root.querySelector('[data-viewbtn="day"]')  ?.addEventListener('click', () => renderView('day'));
  root.querySelector('[data-viewbtn="week"]') ?.addEventListener('click', () => renderView('week'));
  root.querySelector('[data-viewbtn="month"]')?.addEventListener('click', () => renderView('month'));

  // period nav
  root.querySelector('[data-prev]') ?.addEventListener('click', () => navPeriod('prev'));
  root.querySelector('[data-next]') ?.addEventListener('click', () => navPeriod('next'));
  root.querySelector('[data-today]')?.addEventListener('click', () => navPeriod('today'));

  // optional lemon toggle
  root.querySelector('#lemonToggle')?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    btn.setAttribute('aria-expanded', btn.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
  });
}

// ---------- public mount ----------
export function mount(root) {
  document.body.setAttribute('data-view', 'home');
  root.innerHTML = shellHTML();
  wireShell(root);
  // initial content:
  renderView('month'); // or 'day'
}
document.addEventListener('go-day', (e) => {
  const dk = e.detail; // "YYYY-MM-DD"
  if (dk) localStorage.setItem('selectedDate', dk);
  // your show(view) function from the shell:
  (async () => {
    const mod = await import('./day.js');
    const app = document.getElementById('app');
    mod.mount(app);
  })();
});
