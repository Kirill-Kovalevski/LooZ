// Shell only: header + lemon + date + greeting + view buttons + mini period nav + #viewRoot + orb.
// Views (day/week/month) render INSIDE #viewRoot (no page navigation).

// ---------- tiny helpers ----------
const HEB_DAYS = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
const pad2 = n => String(n).padStart(2, '0');
const todayDM = d => `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}`;
const hebDay = d => HEB_DAYS[d.getDay()];

// You can store after sign-up: localStorage.setItem('firstName','אורה'); localStorage.setItem('lastName','כהן');
function getUserName() {
  const first = localStorage.getItem('firstName') || 'אורח';
  const last  = localStorage.getItem('lastName')  || '';
  return last ? `${first} ${last[0]}.` : first;
}

// Mount any view module into #viewRoot
async function show(view /* 'day' | 'week' | 'month' */) {
  const mod = await import(`./${view}.js`);
  const app = document.getElementById('app');
  mod.mount(app);   // every view creates/uses #viewRoot internally
}

// dispatch the (prev|today|next) period event the views listen for
const navPeriod = dir =>
  document.dispatchEvent(new CustomEvent('period-nav', { detail: dir }));

// ---------- shell html ----------
function shellHTML() {
  const d = new Date();
  const dateStr = `${hebd(d)} ${todayDM(d)}`;
  function hebd(dt){ return hebDay(dt); }

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
              <!-- biblical-ish 3 dots -->
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

        <!-- view switch -->
        <nav class="c-view-switch" aria-label="תצוגה">
          <button class="c-headbtn" data-viewbtn="month">חודש</button>
          <button class="c-headbtn" data-viewbtn="week">שבוע</button>
          <button class="c-headbtn" data-viewbtn="day">יום</button>
        </nav>

        <!-- mini period -->
        <div class="c-period-mini">
          <button class="c-pillnav" data-prev aria-label="קודם">‹</button>
          <button class="c-pillnav c-pillnav--today" data-today aria-label="היום">היום</button>
          <button class="c-pillnav" data-next aria-label="הבא">›</button>
        </div>

        <!-- content slot -->
        <section id="viewRoot" class="o-viewroot" aria-live="polite"></section>

        <!-- orb (fixed, bottom-center) -->
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
  root.querySelector('[data-viewbtn="day"]')   ?.addEventListener('click', () => show('day'));
  root.querySelector('[data-viewbtn="week"]')  ?.addEventListener('click', () => show('week'));
  root.querySelector('[data-viewbtn="month"]') ?.addEventListener('click', () => show('month'));

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
  // initial content: month (or change to 'day')
  show('month');
}
