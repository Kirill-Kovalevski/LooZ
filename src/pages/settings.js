// src/pages/settings.js
// Settings: modern RTL, Hebrew palettes, centered demo. Hooks: theme, auto-dark,
// reminders, language, pill colors, default view, logout.

import { getSmallLogo } from '../utils/logo.js';
import { setTheme, getTheme } from '../utils/theme.js';
import { getUser, signOutUser } from '../services/auth.service.js';

import logoLight from '../icons/main-logo.png';
import logoDark  from '../icons/dark-logo.png';

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

const K = {
  THEME_AUTO: "themeAuto",     // '1' | '0'
  LANG: "lang",                // 'he' | 'en'
  PILL_BG: "pillBg",
  PILL_BR: "pillBorder",
  DEFAULT_VIEW: "defaultView", // 'day' | 'week' | 'month'
  REMIND: "reminders",         // '1' | '0'
};

// maker defaults
const DEV_DEFAULTS = { bg: "#FFE067", br: "#f3c340" };

/* Hebrew, connected, pastel-forward palettes */
const PALETTES = [
  { name: "לימון בהיר",   bg:"#FFE067", br:"#F3C340" },
  { name: "אפרסק עדין",   bg:"#FFE3C4", br:"#FDBA74" },
  { name: "חמאת תכלת",   bg:"#FFF6C2", br:"#FACC15" },

  { name: "עלה מנטה",    bg:"#DBFCE5", br:"#34D399" },
  { name: "עשב אביב",    bg:"#E9FCE8", br:"#86EFAC" },
  { name: "מרווה ים",    bg:"#DFFAF5", br:"#14B8A6" },

  { name: "שמיים רכים",  bg:"#E7F2FF", br:"#9CC6FF" },
  { name: "תכלת קרירה",  bg:"#E6F0FF", br:"#60A5FA" },
  { name: "ים עמוק",     bg:"#E0F2FE", br:"#38BDF8" },

  { name: "לילך זוהר",   bg:"#F5E8FF", br:"#D0A3FF" },
  { name: "לבנדר חלומי", bg:"#EEE5FF", br:"#C4B5FD" },
  { name: "לילך קריר",   bg:"#F0F1FF", br:"#A5B4FC" },

  { name: "רוז גולד",    bg:"#FFE6EC", br:"#F39FB6" },
  { name: "שקיעה רכה",   bg:"#FFE4E6", br:"#FB7185" },
  { name: "קורל פופ",    bg:"#FEE2E2", br:"#F87171" },

  { name: "ירח חלב",     bg:"#F7F7F7", br:"#CBD5E1" },
  { name: "אבן חוף",     bg:"#F2F4F7", br:"#94A3B8" },
  { name: "קרם עדין",    bg:"#FFF7ED", br:"#FED7AA" },

  { name: "לילה אינדיגו", bg:"#E0E7FF", br:"#818CF8" },
  { name: "אבן מרווה",    bg:"#ECFDF5", br:"#2DD4BF" },
  { name: "אפור כחלחל",   bg:"#EEF2FF", br:"#93C5FD" }
];

let autoTimer = null;
let reminderTimer = null;

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
  try { localStorage.setItem(K.PILL_BG, bg); localStorage.setItem(K.PILL_BR, br); } catch {}
};

const hourThreshold = (d=new Date()) => (d.getMonth() >= 3 && d.getMonth() <= 9) ? 18 : 17;

function startAutoDark(){
  stopAutoDark();
  const tick = () => {
    if (localStorage.getItem(K.THEME_AUTO) !== "1") return;
    const h = new Date().getHours();
    const mode = h >= hourThreshold() ? "dark" : "light";
    const pinned = sessionStorage.getItem("themePinned");
    if (!pinned) setTheme(mode); // use utils/theme.js
  };
  tick();
  autoTimer = setInterval(tick, 60*1000);
}
function stopAutoDark(){ if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }

/* ---------- reminders ---------- */
async function ensureNotifPermission(){
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  try { return (await Notification.requestPermission()) === "granted"; } catch { return false; }
}
function readItems(){
  const keys = ["events","tasks","todos","items","activities"];
  const out = [];
  for (const k of keys){
    try { const arr = JSON.parse(localStorage.getItem(k) || "[]"); if (Array.isArray(arr)) out.push(...arr); } catch {}
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
        new Notification("🔔 תזכורת", { body: (it.title || it.name || "פעילות") + " בעוד כשעה" });
        if ("vibrate" in navigator) navigator.vibrate(12);
        break;
      }
    }
  };
  reminderTimer = setInterval(poll, 60*1000);
}
function stopReminders(){ if (reminderTimer) { clearInterval(reminderTimer); reminderTimer = null; } }

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
  logout:`<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M10 3h6a3 3 0 0 1 3 3v3h-2V6a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3h2v3a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"/><path fill="currentColor" d="M14 12H4v-2h10l-2-2 1.4-1.4L18.8 11l-5.4 4.4L12 14l2-2Z"/></svg>`
};

/* --------------------------------------------------------------------------------
   PUBLIC MOUNT (named export, accepts root)
---------------------------------------------------------------------------------*/
export function mount(root){
  const target = root || $("#app") || document.body;
  target.innerHTML = template();
  wire(target);
  restore(target);
  startAutoDark();
  if (localStorage.getItem(K.REMIND) === "1") startReminders();
}

/* ---------- view template ---------- */
function template(){
  return `
  <main class="set o-wrap" dir="rtl">
    <header class="topbar">
      <button class="navbtn" data-act="back" aria-label="חזרה">‹</button>
      <h1 class="title">הגדרות</h1>
      <button class="looz-mini-btn" data-act="home" aria-label="עמוד ראשי">
        <img class="looz-mini" src="${logoLight}" alt="LooZ" />
      </button>
    </header>

    <!-- APP SETTINGS -->
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
        <div class="row__icon">${I.lang}</div>
        <div class="row__title">שפה</div>
        <div class="seg">
          <button class="seg__btn" data-lang="he">עברית</button>
          <button class="seg__btn" data-lang="en">English</button>
        </div>
      </div>
    </section>

    <!-- STYLE MY APP -->
    <section class="group">
      <div class="group__title">עצבו את האפליקציה שלכם</div>

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
        <div class="palette-grid" id="paletteGrid"></div>
      </div>

      <div class="maker-row">
        <button class="maker-btn" id="makerBtn">${I.reset}&nbsp;בחירת המפתח</button>
      </div>

      <div class="pill-demo">
        <span class="pill">8</span>
      </div>
    </section>

    <!-- DEFAULT OPENING VIEW -->
    <section class="group">
      <div class="group__title">מסך פתיחה</div>
      <div class="row row--stack">
        <div class="row__icon">${I.view}</div>
        <div class="row__title">תצוגה בתחילת האפליקציה</div>
        <div class="seg" data-seg="defaultview">
          <button class="seg__btn" data-view="day">יום</button>
          <button class="seg__btn" data-view="week">שבוע</button>
          <button class="seg__btn" data-view="month">חודש</button>
        </div>
      </div>
    </section>

    <!-- LOGOUT -->
    <section class="group group--footer">
      <div class="row row--stack">
        <div class="row__title" style="font-weight:800">
          ${(() => {
            const u = getUser?.();
            const name = u?.displayName || u?.email || 'משתמש';
            return `מחובר כעת: <span style="opacity:.8">${name}</span>`;
          })()}
        </div>
        <button class="logout" data-act="logout" aria-label="התנתקות">
          ${I.logout} &nbsp; התנתקות מהחשבון
        </button>
      </div>
    </section>

    <div class="bottom-space"></div>
  </main>
  `;
}

/* ---------- palettes ---------- */
function renderPalettes(root){
  const host = root.querySelector("#paletteGrid");
  if (!host) return;

  host.innerHTML = PALETTES.map((p,i)=>(`
    <button class="palette-chip" data-i="${i}">
      <span class="chip-swatch" style="--sw:${p.bg}; --br:${p.br}"></span>
      <span class="chip-label">${p.name}</span>
    </button>
  `)).join("");

  const selectFromStorage = () => {
    const bg = (localStorage.getItem(K.PILL_BG) || DEV_DEFAULTS.bg).toLowerCase();
    const br = (localStorage.getItem(K.PILL_BR) || DEV_DEFAULTS.br).toLowerCase();
    let sel = -1;
    for (let i=0;i<PALETTES.length;i++){
      if (PALETTES[i].bg.toLowerCase() === bg && PALETTES[i].br.toLowerCase() === br) { sel = i; break; }
    }
    host.querySelectorAll(".palette-chip").forEach((b,idx)=>{
      b.classList.toggle("is-selected", idx === sel);
    });
  };

  host.addEventListener("click",(e)=>{
    const btn = e.target.closest(".palette-chip[data-i]"); if(!btn) return;
    const {bg, br} = PALETTES[+btn.dataset.i];
    applyPillVars(bg, br);
    persistPillVars(bg, br);
    const bgInp = $("#pillBg"); const brInp = $("#pillBorder");
    if (bgInp) bgInp.value = bg;
    if (brInp) brInp.value = br;
    const demo = root.querySelector(".pill");
    if (demo){ demo.style.background = `var(--task-pill-bg)`; demo.style.borderColor = `var(--task-pill-border)`; }
    selectFromStorage();
    document.dispatchEvent(new Event('events-changed'));
  });

  selectFromStorage();
}

/* ---------- wire interactions ---------- */
function wire(root){
  // back & home
  $("[data-act='back']", root)?.addEventListener("click", ()=> history.back());
  $("[data-act='home']", root)?.addEventListener("click", async ()=>{
    const { mount } = await import('./home.js');
    const app = document.getElementById('app');
    mount(app);
  });

  // logout (Firebase)
  $("[data-act='logout']", root)?.addEventListener("click", async ()=>{
    try {
      await signOutUser();                                 // real Firebase sign-out
      sessionStorage.removeItem('looz.postLoginRedirect'); // cleanup
      location.hash = '#/login';                           // go to login screen
    } catch (e) {
      alert(e?.message || 'שגיאה בהתנתקות');
    }
  });

  // theme manual toggle
  $("#themeToggle", root)?.addEventListener("change", (e)=>{
    const on = e.currentTarget.checked;
    sessionStorage.setItem("themePinned", "1");
    setTimeout(()=> sessionStorage.removeItem("themePinned"), 60*1000);
    setTheme(on ? "dark" : "light"); // from utils/theme.js
  });

  // theme auto
  $("#autoToggle", root)?.addEventListener("change", (e)=>{
    const on = e.currentTarget.checked;
    try { localStorage.setItem(K.THEME_AUTO, on ? "1" : "0"); } catch {}
    if (on) startAutoDark(); else stopAutoDark();
  });

  // reminders
  $("#remToggle", root)?.addEventListener("change", async (e)=>{
    const on = e.currentTarget.checked;
    try { localStorage.setItem(K.REMIND, on ? "1" : "0"); } catch {}
    if (on) startReminders(); else stopReminders();
  });

  // language segmented
  $$(".seg__btn[data-lang]", root).forEach(b=>{
    b.addEventListener("click", ()=>{
      setLang(b.dataset.lang);
      reflect(root);
    });
  });

  // default view segmented
  $$(".seg__btn[data-view]", root).forEach(b=>{
    b.addEventListener("click", ()=>{
      try { localStorage.setItem(K.DEFAULT_VIEW, b.dataset.view); } catch {}
      reflect(root);
    });
  });

  // color inputs + live demo
  const bg = $("#pillBg", root), br = $("#pillBorder", root);
  const paint = () => {
    const bgv = bg?.value || DEV_DEFAULTS.bg;
    const brv = br?.value || DEV_DEFAULTS.br;
    applyPillVars(bgv, brv);
    persistPillVars(bgv, brv);
    const demo = root.querySelector(".pill");
    if (demo){ demo.style.background = `var(--task-pill-bg)`; demo.style.borderColor = `var(--task-pill-border)`; }
    root.querySelectorAll(".palette-chip").forEach(el => el.classList.remove("is-selected"));
    document.dispatchEvent(new Event('events-changed'));
  };
  bg?.addEventListener("input", paint);
  br?.addEventListener("input", paint);

  // maker's choice
  $("#makerBtn", root)?.addEventListener("click", ()=>{
    applyPillVars(DEV_DEFAULTS.bg, DEV_DEFAULTS.br);
    persistPillVars(DEV_DEFAULTS.bg, DEV_DEFAULTS.br);
    const demo = root.querySelector(".pill");
    if (demo){ demo.style.background = `var(--task-pill-bg)`; demo.style.borderColor = `var(--task-pill-border)`; }
    const bgInp = $("#pillBg"); const brInp = $("#pillBorder");
    if (bgInp) bgInp.value = DEV_DEFAULTS.bg;
    if (brInp) brInp.value = DEV_DEFAULTS.br;
    renderPalettes(root);
    document.dispatchEvent(new Event('events-changed'));
  });

  renderPalettes(root);
}

/* ---------- restore current settings into UI ---------- */
function restore(root){
  try{
    // theme (from utils)
    const mode = getTheme();
    $("#themeToggle") && ($("#themeToggle").checked = mode === "dark");

    const auto = localStorage.getItem(K.THEME_AUTO);
    const autoOn = (auto === null) ? true : (auto === "1");
    localStorage.setItem(K.THEME_AUTO, autoOn ? "1" : "0");
    $("#autoToggle") && ($("#autoToggle").checked = autoOn);

    const r = localStorage.getItem(K.REMIND) === "1";
    $("#remToggle") && ($("#remToggle").checked = r);

    setLang(localStorage.getItem(K.LANG) || "he");

    const bgv = localStorage.getItem(K.PILL_BG) || DEV_DEFAULTS.bg;
    const brv = localStorage.getItem(K.PILL_BR) || DEV_DEFAULTS.br;
    applyPillVars(bgv, brv);
    $("#pillBg") && ($("#pillBg").value = bgv);
    $("#pillBorder") && ($("#pillBorder").value = brv);

    reflect(root);
  }catch{}
}

function reflect(root){
  const curL = localStorage.getItem(K.LANG) || "he";
  $$(".seg__btn[data-lang]", root).forEach(b=> b.classList.toggle("is-on", b.dataset.lang === curL));
  const curV = localStorage.getItem(K.DEFAULT_VIEW) || "week";
  $$(".seg__btn[data-view]", root).forEach(b=> b.classList.toggle("is-on", b.dataset.view === curV));
}
