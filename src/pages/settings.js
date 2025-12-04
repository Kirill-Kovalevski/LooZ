// src/pages/settings.js
// Settings: RTL, collapsable styling section, working theme / reminders,
// pill-editor + Month / Week palettes with "factory settings" button.

import { setTheme, getTheme } from '../utils/theme.js';
import { getUser, signOutUser } from '../services/auth.service.js';
import { auth } from '../core/firebase.js';

import logoLight from '../icons/profile-logo.png';
import logoDark  from '../icons/dark-logo.png';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const K = {
  THEME_AUTO: "themeAuto",
  LANG: "lang",

  // task pills
  PILL_BG: "pillBg",
  PILL_BR: "pillBorder",

  // default view
  DEFAULT_VIEW: "defaultView",

  // reminders
  REMIND: "reminders",

  // weather
  WEATHER: "weatherEnabled",
  WEATHER_LAT: "weatherLat",
  WEATHER_LNG: "weatherLng",

  // month view overrides
  MONTH_TOP: "monthTop",
  MONTH_MID: "monthMid",
  MONTH_BOT: "monthBot",
  MONTH_ACCENT: "monthAccent",

  // week view overrides
  WEEK_BG: "weekBg",
  WEEK_BORDER: "weekBorder",
};

const DEV_DEFAULTS = { bg: "#FFE067", br: "#f3c340" };

// --------- palettes (task pills) ---------
const PILL_PALETTES = [
  { name: "לימון בהיר",   bg:"#FFE067", br:"#F3C340" },
  { name: "אפרסק עדין",   bg:"#FFE3C4", br:"#FDBA74" },
  { name: "חמאת תכלת",   bg:"#FFF6C2", br:"#FACC15" },
  { name: "עלה מנטה",    bg:"#DBFCE5", br:"#34D399" },
  { name: "עשב אביב",    bg:"#E9FCE8", br:"#86EFAC" },
  { name: "מרווה ים",    bg:"#DFFAF5", br:"#14B8A6" },
  { name: "שמיים רכים",  bg:"#E7F2FF", br:"#9CC6FF" },
  { name: "תכלת קרירה",  bg:"#E6F0FF", br:"#60A5FA" },
  { name: "אפור כחלחל",  bg:"#EEF2FF", br:"#93C5FD" },
  { name: "אבן מרווה",   bg:"#ECFDF5", br:"#2DD4BF" },
];

// --------- palettes (month background) ---------
// These control --m-top / --m-mid / --m-bot / --m-accent used in month.js
const MONTH_PALETTES = [
  { name: "בוקר מנטה",       top:"#DFFAF5", mid:"#E9FCE8", bot:"#F7FFF9", accent:"#14B8A6" },
  { name: "ענני אפרסק",      top:"#FFE6D6", mid:"#FFE3C4", bot:"#FFF9F5", accent:"#FB923C" },
  { name: "שקיעת כורכום",   top:"#FFF1C4", mid:"#FFE3B4", bot:"#FFF9EC", accent:"#FACC15" },
  { name: "שמיים רכים",      top:"#E3F2FD", mid:"#DBEAFE", bot:"#F5F9FF", accent:"#60A5FA" },
  { name: "סגול חלומי",      top:"#E2D5FF", mid:"#EDE9FE", bot:"#F9F5FF", accent:"#A855F7" },
  { name: "חוף עדין",        top:"#F9DCC4", mid:"#FFE4E6", bot:"#FFF7ED", accent:"#FB7185" },
  { name: "יער רך",          top:"#D8F3DC", mid:"#C7F9CC", bot:"#F4FFF6", accent:"#34D399" },
  { name: "חורף תכול",       top:"#CEE5F2", mid:"#E0ECFF", bot:"#F4F8FC", accent:"#3B82F6" },
  { name: "קפה עם חלב",      top:"#EBD5C4", mid:"#F3E3D8", bot:"#FFF8F2", accent:"#C26A3D" },
  { name: "ערב אינדיגו",     top:"#E0E7FF", mid:"#C7D2FE", bot:"#EEF2FF", accent:"#6366F1" },
];

// --------- palettes (week cards) ---------
// These will be wired in week.scss / week.js via CSS vars: --week-card-bg / --week-card-border
const WEEK_PALETTES = [
  { name: "שבוע לימון",         bg:"#FFFBEA", br:"#FACC15" },
  { name: "שבוע שמיים",        bg:"#E0F2FE", br:"#60A5FA" },
  { name: "שבוע מנטה רכה",     bg:"#DCFCE7", br:"#34D399" },
  { name: "שבוע שקיעה",        bg:"#FFE4E6", br:"#FB7185" },
  { name: "שבוע לבנדר",        bg:"#EDE9FE", br:"#A855F7" },
  { name: "שבוע אפרסק חלש",    bg:"#FFF1E6", br:"#FDBA74" },
  { name: "שבוע חוף",          bg:"#FEF3C7", br:"#F97316" },
  { name: "שבוע שמנת קרירה",   bg:"#E5E7EB", br:"#9CA3AF" },
  { name: "שבוע עננים רכים",   bg:"#EEF2FF", br:"#6366F1" },
  { name: "שבוע גן מים",       bg:"#D1FAE5", br:"#059669" },
];

/* ---------- per-user name (for "מחובר כעת") ---------- */
const LS_PREFIX = 'looz';
const curUid = () =>
  auth.currentUser?.uid ||
  (getUser?.() && getUser().uid) ||
  'guest';
const scopedKey = (k) => `${LS_PREFIX}:${curUid()}:${k}`;
const lsScopedGet = (k) => localStorage.getItem(scopedKey(k));

function getSettingsUserName() {
  const f1 = lsScopedGet('firstName');
  const l1 = lsScopedGet('lastName');
  const f2 = localStorage.getItem('firstName');
  const l2 = localStorage.getItem('lastName');

  let first = f1 || f2 || '';
  let last  = l1 || l2 || '';

  if (!first) {
    const u = getUser?.() || auth.currentUser;
    if (u?.displayName) {
      const parts = u.displayName.split(' ').filter(Boolean);
      first = parts[0] || '';
      last  = parts[1] || '';
    } else if (u?.email) {
      first = u.email.split('@')[0];
    }
  }

  if (!first) return 'משתמש';
  const lastInitial = last ? `${last[0]}.` : '';
  return [first, lastInitial].filter(Boolean).join(' ');
}

/* ---------- helpers ---------- */
const setLang = (lang) => {
  const r = document.documentElement;
  r.setAttribute("data-lang", lang);
  r.setAttribute("dir", lang === "en" ? "ltr" : "rtl");
  try { localStorage.setItem(K.LANG, lang); } catch {}
};

const applyPillVars = (bg, br) => {
  const s = document.documentElement.style;
  s.setProperty("--task-pill-bg", bg);
  s.setProperty("--task-pill-border", br);
};
const persistPillVars = (bg, br) => {
  try {
    localStorage.setItem(K.PILL_BG, bg);
    localStorage.setItem(K.PILL_BR, br);
  } catch {}
};

// month view CSS vars
const applyMonthVars = (top, mid, bot, accent) => {
  const s = document.documentElement.style;
  if (top)    s.setProperty('--m-top', top);
  if (mid)    s.setProperty('--m-mid', mid);
  if (bot)    s.setProperty('--m-bot', bot);
  if (accent) s.setProperty('--m-accent', accent);
};
const persistMonthVars = (top, mid, bot, accent) => {
  try {
    localStorage.setItem(K.MONTH_TOP, top);
    localStorage.setItem(K.MONTH_MID, mid);
    localStorage.setItem(K.MONTH_BOT, bot);
    localStorage.setItem(K.MONTH_ACCENT, accent);
  } catch {}
};

// week view CSS vars
const applyWeekVars = (bg, br) => {
  const s = document.documentElement.style;
  if (bg) s.setProperty('--week-card-bg', bg);
  if (br) s.setProperty('--week-card-border', br);
};
const persistWeekVars = (bg, br) => {
  try {
    localStorage.setItem(K.WEEK_BG, bg);
    localStorage.setItem(K.WEEK_BORDER, br);
  } catch {}
};

let autoTimer = null;
let reminderTimer = null;

const hourThreshold = (d=new Date()) =>
  (d.getMonth() >= 3 && d.getMonth() <= 9) ? 18 : 17;

function startAutoDark(){
  stopAutoDark();
  const tick = () => {
    if (localStorage.getItem(K.THEME_AUTO) !== "1") return;
    const h = new Date().getHours();
    const mode = h >= hourThreshold() ? "dark" : "light";
    const pinned = sessionStorage.getItem("themePinned");
    if (!pinned) setTheme(mode);
  };
  tick();
  autoTimer = setInterval(tick, 60*1000);
}
function stopAutoDark(){
  if (autoTimer) {
    clearInterval(autoTimer);
    autoTimer = null;
  }
}

/* ---------- reminders ---------- */
async function ensureNotifPermission(){
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  try {
    return (await Notification.requestPermission()) === "granted";
  } catch {
    return false;
  }
}
function readItems(){
  const keys = ["events","tasks","todos","items","activities"];
  const out = [];
  for (const k of keys){
    try {
      const arr = JSON.parse(localStorage.getItem(k) || "[]");
      if (Array.isArray(arr)) out.push(...arr);
    } catch {}
  }
  return out;
}
function getStartDateLike(it){
  const c = it?.dateKey ?? it?.date ?? it?.start ?? it?.startDate;
  if (!c) return null;
  const d = new Date(c);
  return Number.isNaN(+d) ? null : d;
}
function startReminders(){
  stopReminders();
  const poll = async () => {
    if (localStorage.getItem(K.REMIND) !== "1") return;
    const ok = await ensureNotifPermission();
    if (!ok) return;
    const now = Date.now(), soon = now + 60*60*1000;
    for (const it of readItems()){
      const d = getStartDateLike(it); if (!d) continue;
      const t = +d;
      if (t >= now && t <= soon){
        new Notification("🔔 תזכורת", {
          body: (it.title || it.name || "פעילות") + " בעוד כשעה"
        });
        if ("vibrate" in navigator) navigator.vibrate(12);
        break;
      }
    }
  };
  reminderTimer = setInterval(poll, 60*1000);
}
function stopReminders(){
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
}

/* ---------- icons ---------- */
const I = {
  moon:  `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M21 12.3A8.5 8.5 0 0 1 11.7 3 7 7 0 1 0 21 12.3Z"/></svg>`,
  auto:  `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 6l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L6.2 10l4-.6L12 6z"/></svg>`,
  bell:  `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2zm6-6V11a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2z"/></svg>`,
  lang:  `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2Zm-1 17.9A8 8 0 0 1 4.1 13H11v6.9Zm0-8.9H4.1A8 8 0 0 1 11 4.1V11Zm2 8.9V13h6.9A8 8 0 0 1 13 19.9ZM13 11V4.1A8 8 0 0 1 19.9 11H13Z"/></svg>`,
  fill:  `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M5 19h14v2H5zM4 4l8 8 3-3-8-8H4zm13.5 4.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"/></svg>`,
  stroke:`<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="3" ry="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>`,
  view:  `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/></svg>`,
  reset: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 5V2L7 7l5 5V9c3.3 0 6 2.7 6 6a6 6 0 0 1-9.7 4.7l-1.3 1.5A8 8 0 0 0 12 7z"/></svg>`,
  logout:`<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M10 3h6a3 3 0 0 1 3 3v3h-2V6a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3h2v3a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"/><path fill="currentColor" d="M14 12H4v-2h10l-2-2 1.4-1.4L18.8 11l-5.4 4.4L12 14l2-2Z"/></svg>` ,
  weather:`<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M6 14a4 4 0 0 1 2.7-3.8A5 5 0 0 1 18 9.5 3.5 3.5 0 0 1 17.5 16H7a3 3 0 0 1-1-2Z"/><path fill="currentColor" d="m9 18-1 3h2l1-3H9Zm4 0-1 3h2l1-3h-2Z"/></svg>`
};

export function mount(root){
  document.body.setAttribute('data-view', 'settings');

  const target = root || document.getElementById('app') || document.body;
  target.innerHTML = template();

  wire(target);
  restore(target);
  startAutoDark();
  if (localStorage.getItem(K.REMIND) === "1") startReminders();
}

function template(){
  const userLabel = getSettingsUserName();

  return `
  <main class="set o-wrap" dir="rtl">
    <header class="topbar">
      <button class="navbtn" data-act="back" aria-label="חזרה">‹</button>
      <h1 class="title">הגדרות</h1>
      <button class="looz-mini-btn" data-act="home" aria-label="עמוד ראשי">
        <img class="looz-mini" src="${logoLight}" alt="LooZ" />
      </button>
    </header>

    <section class="group">
      <div class="group__title">הגדרות אפליקציה</div>

      <div class="row">
        <div class="row__icon">${I.moon}</div>
        <div class="row__title">מצב לילה</div>
        <label class="switch">
          <input id="themeToggle" type="checkbox" />
          <span class="track" aria-hidden="true"><span class="thumb"></span></span>
        </label>
      </div>

      <div class="row">
        <div class="row__icon">${I.auto}</div>
        <div class="row__title">מצב לילה אוטומטי</div>
        <label class="switch">
          <input id="autoToggle" type="checkbox" checked />
          <span class="track" aria-hidden="true"><span class="thumb"></span></span>
        </label>
      </div>

      <div class="row">
        <div class="row__icon">${I.bell}</div>
        <div class="row__title">תזכורות יומיות</div>
        <label class="switch">
          <input id="remToggle" type="checkbox" />
          <span class="track" aria-hidden="true"><span class="thumb"></span></span>
        </label>
      </div>

      <div class="row">
        <div class="row__icon">${I.weather}</div>
        <div class="row__title">תחזית שבועית <span style="opacity:.6;font-size:.75rem;">(תצוגת חודש)</span></div>
        <label class="switch">
          <input id="weatherToggle" type="checkbox" />
          <span class="track" aria-hidden="true"><span class="thumb"></span></span>
        </label>
      </div>

      <div class="row">
        <div class="row__icon">${I.lang}</div>
        <div class="row__title">שפה</div>
        <div class="seg">
          <button class="seg__btn" data-lang="he">עברית</button>
          <button class="seg__btn" data-lang="en">English</button>
        </div>
      </div>
    </section>

    <section class="group group--style" data-open="false">
      <button class="row row--head" type="button" id="styleHead" style="width:100%;background:none;border:0;display:flex;align-items:center;gap:.6rem;cursor:pointer;">
        <div class="row__icon">${I.fill}</div>
        <div class="row__title">עצבו את האפליקציה שלכם</div>
        <span class="chev" aria-hidden="true" style="margin-inline-start:auto;transition:transform .15s ease;">▾</span>
      </button>

      <div class="style-body" id="styleBody" style="display:none;gap:.5rem;flex-direction:column;">
        <!-- TASK PILL COLORS -->
        <div class="row">
          <div class="row__icon">${I.fill}</div>
          <div class="row__title">רקע מונה</div>
          <input id="pillBg" class="color" type="color" />
        </div>

        <div class="row">
          <div class="row__icon">${I.stroke}</div>
          <div class="row__title">מסגרת מונה</div>
          <input id="pillBorder" class="color" type="color" />
        </div>

        <div class="palettes">
          <div class="palette-grid" id="pillPaletteGrid"></div>
        </div>

        <div class="pill-demo">
          <span class="pill pill--tasks">8</span>
        </div>

        <!-- MONTH VIEW COLORS -->
        <div class="group__title" style="border-top:1px solid var(--line); margin-top:4px;">
          צבעי תצוגת חודש
        </div>
        <div class="palettes">
          <div class="palette-grid" id="monthPaletteGrid"></div>
        </div>
        <div class="pill-demo">
          <span class="pill pill--month">8</span>
        </div>

        <!-- WEEK VIEW COLORS -->
        <div class="group__title" style="border-top:1px solid var(--line); margin-top:4px;">
          צבעי תצוגת שבוע
        </div>
        <div class="palettes">
          <div class="palette-grid" id="weekPaletteGrid"></div>
        </div>
        <div class="pill-demo">
          <span class="pill pill--week">8</span>
        </div>

        <!-- FACTORY SETTINGS -->
        <div class="maker-row">
          <button class="maker-btn" id="factoryBtn">
            ${I.reset}&nbsp;הגדרות מפעל
          </button>
        </div>
      </div>
    </section>

    <section class="group group--footer" style="display:flex;flex-direction:column;align-items:center;gap:.6rem;">
      <div class="row" style="display:flex;justify-content:center;align-items:center;width:100%;text-align:center;">
        <div class="row__title" style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          מחובר כעת: <span style="opacity:.8;direction:ltr;display:inline-block;">${userLabel}</span>
        </div>
      </div>
      <div class="row row--stack" style="display:flex;justify-content:center;width:100%;">
        <button class="logout" data-act="logout" aria-label="התנתקות" style="gap:.25rem;inline-size:fit-content;">
          ${I.logout}
        </button>
      </div>
    </section>

    <div class="bottom-space"></div>
  </main>
  `;
}

/* ---------- palettes renderers ---------- */
function renderPillPalettes(root){
  const host = root.querySelector("#pillPaletteGrid");
  if (!host) return;

  host.innerHTML = PILL_PALETTES.map((p,i)=>`
    <button class="palette-chip" data-type="pill" data-i="${i}">
      <span class="chip-swatch" style="--sw:${p.bg}; --br:${p.br}"></span>
      <span class="chip-label">${p.name}</span>
    </button>
  `).join("");

  const selectFromStorage = () => {
    const bg = (localStorage.getItem(K.PILL_BG) || DEV_DEFAULTS.bg).toLowerCase();
    const br = (localStorage.getItem(K.PILL_BR) || DEV_DEFAULTS.br).toLowerCase();
    let sel = -1;
    for (let i=0;i<PILL_PALETTES.length;i++){
      if (PILL_PALETTES[i].bg.toLowerCase() === bg && PILL_PALETTES[i].br.toLowerCase() === br) { sel = i; break; }
    }
    host.querySelectorAll(".palette-chip[data-type='pill']").forEach((b,idx)=>{
      b.classList.toggle("is-selected", idx === sel);
    });
  };

  selectFromStorage();
}

function renderMonthPalettes(root){
  const host = root.querySelector("#monthPaletteGrid");
  if (!host) return;

  host.innerHTML = MONTH_PALETTES.map((p,i)=>`
    <button class="palette-chip" data-type="month" data-i="${i}">
      <span class="chip-swatch" style="--sw:${p.mid}; --br:${p.accent}"></span>
      <span class="chip-label">${p.name}</span>
    </button>
  `).join("");

  const selectFromStorage = () => {
    const top = (localStorage.getItem(K.MONTH_TOP) || "").toLowerCase();
    const mid = (localStorage.getItem(K.MONTH_MID) || "").toLowerCase();
    const bot = (localStorage.getItem(K.MONTH_BOT) || "").toLowerCase();

    let sel = -1;
    for (let i=0;i<MONTH_PALETTES.length;i++){
      const p = MONTH_PALETTES[i];
      if (top === p.top.toLowerCase() &&
          mid === p.mid.toLowerCase() &&
          bot === p.bot.toLowerCase()) {
        sel = i; break;
      }
    }
    host.querySelectorAll(".palette-chip[data-type='month']").forEach((b,idx)=>{
      b.classList.toggle("is-selected", idx === sel);
    });
  };

  selectFromStorage();
}

function renderWeekPalettes(root){
  const host = root.querySelector("#weekPaletteGrid");
  if (!host) return;

  host.innerHTML = WEEK_PALETTES.map((p,i)=>`
    <button class="palette-chip" data-type="week" data-i="${i}">
      <span class="chip-swatch" style="--sw:${p.bg}; --br:${p.br}"></span>
      <span class="chip-label">${p.name}</span>
    </button>
  `).join("");

  const selectFromStorage = () => {
    const bg = (localStorage.getItem(K.WEEK_BG) || "").toLowerCase();
    const br = (localStorage.getItem(K.WEEK_BORDER) || "").toLowerCase();
    let sel = -1;
    for (let i=0;i<WEEK_PALETTES.length;i++){
      const p = WEEK_PALETTES[i];
      if (bg === p.bg.toLowerCase() && br === p.br.toLowerCase()) { sel = i; break; }
    }
    host.querySelectorAll(".palette-chip[data-type='week']").forEach((b,idx)=>{
      b.classList.toggle("is-selected", idx === sel);
    });
  };

  selectFromStorage();
}

/* ---------- wire ---------- */
function wire(root){
  // BACK / HOME → go to default day/week/month view
  $("[data-act='back']", root)?.addEventListener("click", () => {
    const def = localStorage.getItem(K.DEFAULT_VIEW) || 'month';
    location.hash = '#/' + def;
  });
  $("[data-act='home']", root)?.addEventListener("click", () => {
    const def = localStorage.getItem(K.DEFAULT_VIEW) || 'month';
    location.hash = '#/' + def;
  });

  // logout
  $("[data-act='logout']", root)?.addEventListener("click", async ()=> {
    try {
      await signOutUser();
      sessionStorage.removeItem('looz.postLoginRedirect');
      location.hash = '#/login';
    } catch (e) {
      alert(e?.message || 'שגיאה בהתנתקות');
    }
  });

  $("#themeToggle", root)?.addEventListener("change", (e)=>{
    const on = e.currentTarget.checked;
    sessionStorage.setItem("themePinned", "1");
    setTimeout(()=> sessionStorage.removeItem("themePinned"), 60*1000);
    setTheme(on ? "dark" : "light");
  });

  $("#autoToggle", root)?.addEventListener("change", (e)=>{
    const on = e.currentTarget.checked;
    try { localStorage.setItem(K.THEME_AUTO, on ? "1" : "0"); } catch {}
    if (on) startAutoDark(); else stopAutoDark();
  });

  $("#remToggle", root)?.addEventListener("change", async (e)=>{
    const on = e.currentTarget.checked;
    try { localStorage.setItem(K.REMIND, on ? "1" : "0"); } catch {}
    if (on) startReminders(); else stopReminders();
  });

  $("#weatherToggle", root)?.addEventListener("change", (e)=>{
    const on = e.currentTarget.checked;

    const weatherKeys = [
      K.WEATHER,
      'weatherEnabled',
      'weatherOn',
      'showWeather',
      'monthWeather'
    ];
    weatherKeys.forEach(k => localStorage.setItem(k, on ? '1' : '0'));

    localStorage.setItem('monthWeatherLayout', on ? 'weather' : 'plain');

    if (on) {
      document.dispatchEvent(new CustomEvent('weather-pref-changed', {
        detail: { enabled: true, layout: 'weather' }
      }));

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition((pos)=>{
          const { latitude, longitude } = pos.coords;
          localStorage.setItem(K.WEATHER_LAT, String(latitude));
          localStorage.setItem(K.WEATHER_LNG, String(longitude));
          document.dispatchEvent(new CustomEvent('weather-pref-changed', {
            detail: { enabled: true, layout: 'weather', lat: latitude, lng: longitude }
          }));
        }, ()=>{ /* still enabled */ });
      }
    } else {
      localStorage.removeItem(K.WEATHER_LAT);
      localStorage.removeItem(K.WEATHER_LNG);
      document.dispatchEvent(new CustomEvent('weather-pref-changed', {
        detail: { enabled: false, layout: 'plain' }
      }));
    }
  });

  $$(".seg__btn[data-lang]", root).forEach(b=>{
    b.addEventListener("click", ()=>{
      setLang(b.dataset.lang);
      reflect(root);
    });
  });

  // manual task-pill colors
  const bg = $("#pillBg", root), br = $("#pillBorder", root);
  const paintPill = () => {
    const bgv = bg?.value || DEV_DEFAULTS.bg;
    const brv = br?.value || DEV_DEFAULTS.br;
    applyPillVars(bgv, brv);
    persistPillVars(bgv, brv);
    const demo = root.querySelector(".pill--tasks");
    if (demo){
      demo.style.background   = `var(--task-pill-bg)`;
      demo.style.borderColor  = `var(--task-pill-border)`;
    }
    root.querySelectorAll(".palette-chip[data-type='pill']").forEach(el => el.classList.remove("is-selected"));
    document.dispatchEvent(new Event('events-changed'));
  };
  bg?.addEventListener("input", paintPill);
  br?.addEventListener("input", paintPill);

  // palette chip clicks (all three types)
  root.addEventListener('click', (e) => {
    const chip = e.target.closest('.palette-chip[data-type]');
    if (!chip) return;
    const type = chip.dataset.type;
    const idx  = +chip.dataset.i;

    if (type === 'pill') {
      const { bg, br } = PILL_PALETTES[idx];
      applyPillVars(bg, br);
      persistPillVars(bg, br);
      if (bg) bg && ($("#pillBg").value = bg);
      if (br) br && ($("#pillBorder").value = br);
      const demo = root.querySelector(".pill--tasks");
      if (demo){
        demo.style.background   = `var(--task-pill-bg)`;
        demo.style.borderColor  = `var(--task-pill-border)`;
      }
      root.querySelectorAll(".palette-chip[data-type='pill']").forEach(b=>b.classList.remove('is-selected'));
      chip.classList.add('is-selected');
      document.dispatchEvent(new Event('events-changed'));
    }

    if (type === 'month') {
      const { top, mid, bot, accent } = MONTH_PALETTES[idx];
      applyMonthVars(top, mid, bot, accent);
      persistMonthVars(top, mid, bot, accent);
      const demo = root.querySelector(".pill--month");
      if (demo){
        demo.style.background  = mid;
        demo.style.borderColor = accent;
      }
      root.querySelectorAll(".palette-chip[data-type='month']").forEach(b=>b.classList.remove('is-selected'));
      chip.classList.add('is-selected');
      document.dispatchEvent(new CustomEvent('month-style-changed'));
    }

    if (type === 'week') {
      const { bg, br } = WEEK_PALETTES[idx];
      applyWeekVars(bg, br);
      persistWeekVars(bg, br);
      const demo = root.querySelector(".pill--week");
      if (demo){
        demo.style.background  = bg;
        demo.style.borderColor = br;
      }
      root.querySelectorAll(".palette-chip[data-type='week']").forEach(b=>b.classList.remove('is-selected'));
      chip.classList.add('is-selected');
      document.dispatchEvent(new CustomEvent('week-style-changed'));
    }
  });

  // factory defaults ("editor's choice")
  $("#factoryBtn", root)?.addEventListener("click", () => {
    // task pills → אבן מרווה
    const pillDefault = PILL_PALETTES[9]; // אבן מרווה
    applyPillVars(pillDefault.bg, pillDefault.br);
    persistPillVars(pillDefault.bg, pillDefault.br);
    if ($("#pillBg")) $("#pillBg").value = pillDefault.bg;
    if ($("#pillBorder")) $("#pillBorder").value = pillDefault.br;

    // month → שקיעת כורכום
    const monthDefault = MONTH_PALETTES[2];
    applyMonthVars(monthDefault.top, monthDefault.mid, monthDefault.bot, monthDefault.accent);
    persistMonthVars(monthDefault.top, monthDefault.mid, monthDefault.bot, monthDefault.accent);

    // week → שבוע מנטה רכה
    const weekDefault = WEEK_PALETTES[2];
    applyWeekVars(weekDefault.bg, weekDefault.br);
    persistWeekVars(weekDefault.bg, weekDefault.br);

    // re-select in UI
    renderPillPalettes(root);
    renderMonthPalettes(root);
    renderWeekPalettes(root);
    reflect(root);
  });

  const styleHead = $("#styleHead", root);
  const styleBody = $("#styleBody", root);
  styleHead?.addEventListener('click', ()=>{
    const open = styleBody.style.display === 'block';
    styleBody.style.display = open ? 'none' : 'block';
    styleHead.querySelector('.chev')?.style.setProperty(
      'transform',
      open ? 'rotate(0deg)' : 'rotate(180deg)'
    );
  });

  renderPillPalettes(root);
  renderMonthPalettes(root);
  renderWeekPalettes(root);
}

/* ---------- restore ---------- */
function restore(root){
  try{
    const mode = getTheme();
    $("#themeToggle") && ($("#themeToggle").checked = mode === "dark");

    const auto = localStorage.getItem(K.THEME_AUTO);
    const autoOn = (auto === null) ? true : (auto === "1");
    localStorage.setItem(K.THEME_AUTO, autoOn ? "1" : "0");
    $("#autoToggle") && ($("#autoToggle").checked = autoOn);

    const r = localStorage.getItem(K.REMIND) === "1";
    $("#remToggle") && ($("#remToggle").checked = r);

    const weatherOn =
      localStorage.getItem(K.WEATHER) === '1' ||
      localStorage.getItem('weatherOn') === '1' ||
      localStorage.getItem('showWeather') === '1' ||
      localStorage.getItem('monthWeather') === '1';
    $("#weatherToggle") && ($("#weatherToggle").checked = weatherOn);

    localStorage.setItem('monthWeatherLayout', weatherOn ? 'weather' : 'plain');

    const savedLat = localStorage.getItem(K.WEATHER_LAT);
    const savedLng = localStorage.getItem(K.WEATHER_LNG);
    document.dispatchEvent(new CustomEvent('weather-pref-changed', {
      detail: {
        enabled: weatherOn,
        layout: weatherOn ? 'weather' : 'plain',
        ...(savedLat ? { lat: Number(savedLat) } : {}),
        ...(savedLng ? { lng: Number(savedLng) } : {})
      }
    }));

    setLang(localStorage.getItem(K.LANG) || "he");

    // restore task pills
    const bgv = localStorage.getItem(K.PILL_BG) || DEV_DEFAULTS.bg;
    const brv = localStorage.getItem(K.PILL_BR) || DEV_DEFAULTS.br;
    applyPillVars(bgv, brv);
    $("#pillBg") && ($("#pillBg").value = bgv);
    $("#pillBorder") && ($("#pillBorder").value = brv);

    const pillDemo = root.querySelector(".pill--tasks");
    if (pillDemo){
      pillDemo.style.background  = `var(--task-pill-bg)`;
      pillDemo.style.borderColor = `var(--task-pill-border)`;
    }

    // restore month overrides (if exist)
    const mt = localStorage.getItem(K.MONTH_TOP);
    const mm = localStorage.getItem(K.MONTH_MID);
    const mb = localStorage.getItem(K.MONTH_BOT);
    const ma = localStorage.getItem(K.MONTH_ACCENT);
    if (mt && mm && mb) {
      applyMonthVars(mt, mm, mb, ma || '');
      const demoM = root.querySelector(".pill--month");
      if (demoM){
        demoM.style.background  = mm;
        demoM.style.borderColor = ma || '#999';
      }
    }

    // restore week overrides (if exist)
    const wb = localStorage.getItem(K.WEEK_BG);
    const wbr = localStorage.getItem(K.WEEK_BORDER);
    if (wb && wbr){
      applyWeekVars(wb, wbr);
      const demoW = root.querySelector(".pill--week");
      if (demoW){
        demoW.style.background  = wb;
        demoW.style.borderColor = wbr;
      }
    }

    reflect(root);
  }catch{}
}

function reflect(root){
  const curL = localStorage.getItem(K.LANG) || "he";
  $$(".seg__btn[data-lang]", root).forEach(b=>{
    const on = b.dataset.lang === curL;
    b.classList.toggle("is-on", on);
    b.classList.toggle("is-active", on);
  });

  // NOTE: no seg__btn[data-view] in Settings anymore – the
  // יום/שבוע/חודש controls live only inside the Home shell.
}

export default { mount };
