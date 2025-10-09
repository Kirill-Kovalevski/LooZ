/* ===== LooZ — Planner App (home) — vFinal.16 (mic start fix + time gating) ===== */
(function () {
  'use strict';

  /* -------- AUTH GUARD -------- */
  (function guard() {
    try {
      var u = localStorage.getItem('authUser') || localStorage.getItem('auth.user');
      if (!u) location.replace('auth.html');
    } catch (_) { location.replace('auth.html'); }
  })();

  /* ===================== Helpers ===================== */
  const $  = (sel, root=document) => root.querySelector(sel);
  const go = (href) => (window.location.href = href);
  const pad2 = (n) => String(n).padStart(2, '0');
  const escapeHtml = (s='') => s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const sameDay = (a,b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  const dateKey = (d) => d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
  const fromKey = (ymd) => { const p=(ymd||'').split('-'); return new Date(+p[0],(+p[1]||1)-1,+p[2]||1); };
  const startOfWeek = (d, weekStart) => { const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()); const diff=(x.getDay()-weekStart+7)%7; x.setDate(x.getDate()-diff); return x; };
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const addMonths = (d,n) => new Date(d.getFullYear(), d.getMonth()+n, 1);

  const HEB_DAYS   = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  const HEB_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

  /* ===================== Top buttons ===================== */
  const btnProfile    = $('#btnProfile');
  const btnMenu       = $('#btnMenu');
  const btnCategories = $('#btnCategories');
  const btnSocial     = $('#btnSocial');

  btnProfile   && btnProfile.addEventListener('click', () => go('profile.html'));
  btnMenu      && btnMenu.addEventListener('click', () => go('settings.html'));
  btnCategories&& btnCategories.addEventListener('click', () => go('categories.html'));
  btnSocial    && btnSocial.addEventListener('click', () => go('social.html'));

  const lemonToggle = $('#lemonToggle');
  const appNav      = $('#appNav');
  const navPanel    = appNav ? appNav.querySelector('.c-nav__panel') : null;

  const titleDay   = $('#titleDay');
  const titleDate  = $('#titleDate');
  const titleBadge = $('#titleBadge');

  const plannerRoot = $('#planner');
  const btnDay   = $('#btnDay');
  const btnWeek  = $('#btnWeek');
  const btnMonth = $('#btnMonth');

  // Legacy bottom sheet (no-op if elements don’t exist)
  const sheet      = $('#eventSheet');
  const sheetPanel = sheet ? sheet.querySelector('.c-sheet__panel') : null;
  const sheetClose = sheet ? sheet.querySelector('[data-close]') : null;
  const sheetForm  = $('#sheetForm');
  const titleInput = $('#evtTitle');
  const dateInput  = $('#evtDate');
  const timeInput  = $('#evtTime');

  const subtitleEl   = $('.c-subtitle');
  const createOrbBtn = $('.btn-create-orb');

  /* ===================== Greeting ===================== */
  function getAuth() { try { const raw = localStorage.getItem('authUser') || localStorage.getItem('auth.user'); return raw ? JSON.parse(raw) : null; } catch { return null; } }
  function getProfile() { try { return JSON.parse(localStorage.getItem('profile') || '{}'); } catch { return {}; } }
  function getDisplayName() {
    const prof = getProfile();
    if (prof.firstName) return prof.firstName;
    if (prof.name) return prof.name;
    const au = getAuth();
    if (au) return au.firstName || au.name || au.displayName || au.email || 'חברה';
    return localStorage.getItem('authName') || 'חברה';
  }
  (function setGreeting(){
    const name = escapeHtml(getDisplayName());
    const au = getAuth();
    const SPECIAL_EMAIL = 'daniellagg21@gmail.com';
    const isSpecial = !!(au && String(au.email||'').toLowerCase()===SPECIAL_EMAIL.toLowerCase());
    if (subtitleEl) {
      subtitleEl.innerHTML = isSpecial
        ? '<div style="font-weight:800;margin-bottom:.15rem">נשמולית שלי</div>'
          + '<div>איזה כיף שחזרת <strong>'+name+'</strong></div>'
          + '<div>לוז מושלם מחכה לך</div>'
        : 'ברוכים השבים, <strong id="uiName">'+name+'</strong>!<br>מה בלוז сегодня?'.replace('сегодня','היום');
    }
  })();

  /* ===================== State ===================== */
  const STORAGE_KEY = 'plannerTasks';
  const PREFS_KEY   = 'plannerPrefs';
  const loadTasks = () => { try { const raw=localStorage.getItem(STORAGE_KEY); const a=raw?JSON.parse(raw):[]; return Array.isArray(a)?a:[]; } catch { return []; } };
  const saveTasks = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks)); } catch {} };
  const loadPrefs = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; } };
  const persistPrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {} };

  const prefs = loadPrefs();
  const weekStart = (prefs.weekStart==='mon') ? 1 : 0;

  // Track last selected calendar date for prefill
  let state = {
    view: (prefs.defaultView || 'month'),
    current: new Date(),
    tasks: loadTasks(),
    selectedDate: dateKey(new Date())
  };

  const formatTitle = (d) => {
    if (titleDay)  titleDay.textContent  = HEB_DAYS[d.getDay()];
    if (titleDate) titleDate.textContent = `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()}`;
  };
  const markToday = () => { titleBadge && titleBadge.setAttribute('data-today','1'); };

  /* ===================== Lemon nav ===================== */
  (function initNav(){
    if (!lemonToggle || !appNav || !navPanel) return;
    appNav.classList.add('u-is-collapsed');
    lemonToggle.setAttribute('aria-expanded','false');
    appNav.setAttribute('aria-hidden','true');

    function open(){
      appNav.classList.remove('u-is-collapsed');
      appNav.setAttribute('aria-hidden','false');
      lemonToggle.setAttribute('aria-expanded','true');
      navPanel.style.maxHeight = navPanel.scrollHeight+'px';
      navPanel.addEventListener('transitionend', function onEnd(e){
        if (e.propertyName==='max-height'){ navPanel.style.maxHeight=''; navPanel.removeEventListener('transitionend', onEnd); }
      });
    }
    function close(){
      const h = navPanel.scrollHeight;
      navPanel.style.maxHeight = h+'px';
      void navPanel.offsetHeight; // reflow
      navPanel.style.maxHeight = '0px';
      lemonToggle.setAttribute('aria-expanded','false');
      appNav.setAttribute('aria-hidden','true');
      appNav.classList.add('u-is-collapsed');
    }
    lemonToggle.addEventListener('click', () => {
      const collapsed = appNav.classList.contains('u-is-collapsed') || appNav.getAttribute('aria-hidden')==='true';
      collapsed ? open() : close();
    });
  })();

  /* ===================== Color scale ===================== */
  function pastelFor(n){
    const band = n<=0 ? 0 : Math.min(6, Math.floor((n-1)/3)+1);
    const tones = [
      { fg:'#475569', ring:'#e5e7eb' }, { fg:'#0ea5e9', ring:'#93c5fd' }, { fg:'#16a34a', ring:'#86efac' },
      { fg:'#f59e0b', ring:'#fde68a' }, { fg:'#a855f7', ring:'#ddd6fe' }, { fg:'#db2777', ring:'#fbcfe8' },
      { fg:'#1d4ed8', ring:'#bfdbfe' },
    ];
    return {band, ...tones[band]};
  }

  /* ===================== Renderers ===================== */
  function render(){
    formatTitle(state.current); markToday();
    state.selectedDate = dateKey(state.current);
    if (!plannerRoot) return;
    btnDay   && btnDay.classList.toggle('is-active', state.view==='day');
    btnWeek  && btnWeek.classList.toggle('is-active', state.view==='week');
    btnMonth && btnMonth.classList.toggle('is-active', state.view==='month');
    if (state.view==='day') renderDay();
    else if (state.view==='week') renderWeek();
    else renderMonth();
  }

  function buildBar(scope, titleText){
    const bar = document.createElement('div');
    bar.className = 'p-weekbar p-bar--stack';
    bar.setAttribute('data-scope', scope);
    bar.innerHTML =
      '<button class="p-weekbar__btn" data-nav="prev"  aria-label="הקודם">‹</button>'+
      '<button class="p-weekbar__btn" data-nav="today">היום</button>'+
      '<button class="p-weekbar__btn" data-nav="next"  aria-label="הבא">›</button>'+
      `<div class="p-weekbar__title">${titleText}</div>`;
    bar.addEventListener('click', (e)=>{
      const b = e.target.closest('[data-nav]'); if(!b) return;
      const k = b.getAttribute('data-nav');
      if (scope === 'day') {
        if (k==='prev') state.current.setDate(state.current.getDate()-1);
        else if (k==='next') state.current.setDate(state.current.getDate()+1);
        else state.current = new Date();
      } else if (scope === 'week') {
        if (k==='prev') state.current.setDate(state.current.getDate()-7);
        else if (k==='next') state.current.setDate(state.current.getDate()+7);
        else state.current = new Date();
      } else {
        if (k==='prev') state.current = addMonths(startOfMonth(state.current), -1);
        else if (k==='next') state.current = addMonths(startOfMonth(state.current),  1);
        else state.current = new Date();
      }
      state.selectedDate = dateKey(state.current);
      render(); persistPrefs();
    });
    return bar;
  }

  function renderDay(){
    plannerRoot.innerHTML = '';
    const d = state.current;
    const title = `${pad2(d.getDate())}.${pad2(d.getMonth()+1)} — ${HEB_DAYS[d.getDay()]}`;
    plannerRoot.appendChild(buildBar('day', title));

    const wrap = document.createElement('div');
    wrap.className = 'p-dayview';
    const ymd = dateKey(state.current);
    const items = state.tasks.filter(t => t.date===ymd).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
    if (!items.length){
      const empty = document.createElement('div'); empty.className='p-empty'; empty.textContent='אין אירועים ליום זה.'; wrap.appendChild(empty);
    } else {
      items.forEach(t=>{
        const row = document.createElement('div');
        row.className='p-daytask';
        row.innerHTML =
          '<div class="p-daytask__actions">'+
            `<button class="p-ico p-ico--del" title="מחק"  data-del="${t.id}"  aria-label="מחק"></button>`+
            `<button class="p-ico p-ico--ok"  title="בוצע" data-done="${t.id}" aria-label="בוצע"></button>`+
          '</div>'+
          `<div class="p-daytask__time">${t.time||''}</div>`+
          `<div class="p-daytask__text">${escapeHtml(t.title)}</div>`;
        wrap.appendChild(row);
      });
    }
    plannerRoot.appendChild(wrap);
  }

  function renderWeek(){
    plannerRoot.innerHTML = '';
    const s = startOfWeek(state.current, weekStart);
    const e = new Date(s); e.setDate(s.getDate()+6);
    const sM = HEB_MONTHS[s.getMonth()], eM = HEB_MONTHS[e.getMonth()];
    const barTitle = (s.getMonth()===e.getMonth())
      ? `${s.getDate()}–${e.getDate()} ${sM} ${s.getFullYear()}`
      : `${s.getDate()} ${sM} – ${e.getDate()} ${eM} ${s.getFullYear()}`;
    plannerRoot.appendChild(buildBar('week', barTitle));

    const wrap = document.createElement('div');
    wrap.className = 'p-week';
    const start = startOfWeek(state.current, weekStart);
    for (let i=0;i<7;i++){
      const day = new Date(start); day.setDate(start.getDate()+i);
      const ymd = dateKey(day);
      const count = state.tasks.filter(t=>t.date===ymd).length;
      const tone  = pastelFor(count);
      const box = document.createElement('div');
      box.className = 'p-day'+(sameDay(day,new Date())?' p-day--today':'');
      box.dataset.goto = ymd;

      const head = document.createElement('div');
      head.className = 'p-day__head p-day__head--flex';
      head.innerHTML =
        `<span class="p-day__name">${HEB_DAYS[day.getDay()]}</span>`+
        `<span class="p-day__date">${pad2(day.getDate())}.${pad2(day.getMonth()+1)}</span>`+
        `<button class="p-day__count" data-open="${ymd}" style="--tone:${tone.fg}; color:${tone.fg}">${count}</button>`;
      box.appendChild(head);

      if (state._openWeek===ymd){
        const items = state.tasks.filter(t=>t.date===ymd).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
        const list = document.createElement('div'); list.className='p-day__list';
        if (!items.length) list.innerHTML = '<div class="p-empty small">אין אירועים</div>';
        else {
          items.forEach(t=>{
            const row = document.createElement('div');
            row.className='p-task';
            row.innerHTML =
              '<div class="p-task__actions">'+
                `<button class="p-ico p-ico--del" title="מחק"  data-del="${t.id}"  aria-label="מחק"></button>`+
                `<button class="p-ico p-ico--ok"  title="בוצע" data-done="${t.id}" aria-label="בוצע"></button>`+
              '</div>'+
              `<div class="p-task__time">${t.time||''}</div>`+
              `<div class="p-task__text">${escapeHtml(t.title)}</div>`;
            list.appendChild(row);
          });
        }
        box.appendChild(list);
      }
      wrap.appendChild(box);
    }
    plannerRoot.appendChild(wrap);
  }

  function renderMonth(){
    plannerRoot.innerHTML = '';
    const title = `${HEB_MONTHS[state.current.getMonth()]} ${state.current.getFullYear()}`;
    plannerRoot.appendChild(buildBar('month', title));

    const grid = document.createElement('div'); grid.className='p-month';
    const anchor = new Date(state.current.getFullYear(), state.current.getMonth(), 1);
    const firstDow = (anchor.getDay()-weekStart+7)%7;
    const start = new Date(anchor); start.setDate(anchor.getDate()-firstDow);
    const now = new Date();
    for (let i=0;i<42;i++){
      const day = new Date(start); day.setDate(start.getDate()+i);
      const ymd = dateKey(day);
      const count = state.tasks.filter(t=>t.date===ymd).length;
      const tone  = pastelFor(count);
      const cell = document.createElement('div');
      let cls='p-cell'; if (day.getMonth()!==state.current.getMonth()) cls+=' p-cell--pad';
      if (sameDay(day, now)) cls+=' p-cell--today';
      cell.className=cls; cell.dataset.goto=ymd; cell.style.setProperty('--ring-color',tone.fg);
      const num = document.createElement('div'); num.className='p-cell__num'; num.textContent = day.getDate();
      if (count>0){ const b=document.createElement('span'); b.className='p-count'; b.textContent=count; b.style.setProperty('--tone',tone.fg); b.style.color=tone.fg; cell.appendChild(b); }
      cell.appendChild(num); grid.appendChild(cell);
    }
    plannerRoot.appendChild(grid);

    let touchX=0, swiping=false;
    grid.addEventListener('touchstart', e=>{ if (e.touches[0]){ touchX=e.touches[0].clientX; swiping=true; } }, {passive:true});
    grid.addEventListener('touchend', e=>{
      if (!swiping) return;
      const dx=(e.changedTouches&&e.changedTouches[0])?e.changedTouches[0].clientX-touchX:0;
      if (Math.abs(dx)>40){ state.current = addMonths(startOfMonth(state.current), dx<0?1:-1); render(); }
      swiping=false;
    }, {passive:true});
  }

  /* ===================== Interactions ===================== */
  btnDay   && btnDay.addEventListener('click',  ()=>{ state.view='day';   render(); prefs.defaultView='day';   persistPrefs(); });
  btnWeek  && btnWeek.addEventListener('click', ()=>{ state.view='week';  render(); prefs.defaultView='week';  persistPrefs(); });
  btnMonth && btnMonth.addEventListener('click',()=>{ state.view='month'; render(); prefs.defaultView='month'; persistPrefs(); });

  // Create new uses the currently selected day
  createOrbBtn && createOrbBtn.addEventListener('click', (e) => {
    e.preventDefault();
    state.selectedDate = dateKey(state.current);
    openComposer();
  });

  if (plannerRoot){
    plannerRoot.addEventListener('click', (e)=>{
      const openBtn = e.target.closest && e.target.closest('[data-open]');
      if (openBtn){
        const dayKey = openBtn.getAttribute('data-open');
        state._openWeek = (state._openWeek===dayKey) ? null : dayKey;
        render(); return;
      }
      const hostGoto = e.target.closest && e.target.closest('[data-goto]');
      if (hostGoto && !e.target.closest('[data-open]')){
        // Jump to that day in Day view AND remember it for composer
        state.current = fromKey(hostGoto.dataset.goto);
        state.selectedDate = hostGoto.dataset.goto;
        state.view = 'day';
        render();
        return;
      }
      const doneId = e.target && e.target.getAttribute('data-done');
      const delId  = e.target && e.target.getAttribute('data-del');
      const bumpStat = (kind)=>{
        try {
          const k = 'loozStats';
          const o = JSON.parse(localStorage.getItem(k) || '{"doneTotal":0,"removedTotal":0}');
          if (kind === 'done')    o.doneTotal    = (o.doneTotal||0) + 1;
          if (kind === 'removed') o.removedTotal = (o.removedTotal||0) + 1;
          localStorage.setItem(k, JSON.stringify(o));
        } catch(_) {}
      };
      if (doneId){
        bumpStat('done');
        blastConfetti(e.clientX||0, e.clientY||0, 1.0);
        state.tasks = state.tasks.filter(t=>t.id!==doneId);
        saveTasks(); render();
      } else if (delId){
        bumpStat('removed');
        const row = e.target.closest && e.target.closest('.p-task,.p-daytask');
        if (row){
          row.classList.add('is-scratching');
          setTimeout(()=>{ state.tasks = state.tasks.filter(t=>t.id!==delId); saveTasks(); render(); }, 520);
        } else {
          state.tasks = state.tasks.filter(t=>t.id!==delId); saveTasks(); render();
        }
      }
    });
  }

  /* ===================== Bottom Sheet (optional) ===================== */
  function openSheet(){ if (!sheet) return; sheet.classList.remove('u-hidden'); sheet.classList.add('is-open'); try { titleInput && titleInput.focus(); } catch {} }
  function closeSheet(){ if (!sheet) return; sheet.classList.remove('is-open'); setTimeout(()=>sheet.classList.add('u-hidden'), 220); }
  if (sheet){
    sheetClose && sheetClose.addEventListener('click', e=>{ e.preventDefault(); closeSheet(); });
    sheetPanel && sheetPanel.addEventListener('click', (e)=>{
      const qd = e.target.closest && e.target.closest('.qp__chip[data-date]');
      if (qd){
        e.preventDefault();
        const kind = qd.getAttribute('data-date');
        const base = new Date();
        if (kind==='מחר' || kind==='tomorrow') base.setDate(base.getDate()+1);
        else if (kind==='שבוע הבא' || kind==='nextweek') base.setDate(base.getDate()+7);
        else if (/^\+\d+$/.test(kind)) base.setDate(base.getDate()+parseInt(kind.slice(1),10));
        if (dateInput) dateInput.value = dateKey(base);
        return;
      }
      const qt = e.target.closest && e.target.closest('.qp__chip[data-time]');
      if (qt){
        e.preventDefault();
        const k = qt.getAttribute('data-time');
        const now = new Date();
        if (/^now\+\d+$/.test(k)){
          const m = parseInt(k.split('+')[1],10)||0; now.setMinutes(now.getMinutes()+m);
          timeInput && (timeInput.value = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`);
        } else if (/^\d{2}:\d{2}$/.test(k)){
          timeInput && (timeInput.value = k);
        }
      }
    });
    sheet.addEventListener('click', (e)=>{ if (e.target && e.target.matches('.c-sheet__backdrop')) closeSheet(); });
  }
  document.addEventListener('keydown', (e)=>{ if (e.key==='Escape') closeSheet(); });
  sheetForm && sheetForm.addEventListener('submit', (e)=>{ e.preventDefault(); autoSaveComposer(); });
/* ===================== Fullscreen Composer ===================== */
const composer      = document.getElementById('eventComposer');
const compPanel     = composer ? composer.querySelector('.composer__panel') : null;
const compCloseBtns = composer ? composer.querySelectorAll('[data-close]') : [];
const compForm      = document.getElementById('composerForm');
const compTitle     = document.getElementById('compTitle');
const compDate      = document.getElementById('compDate');
const compTime      = document.getElementById('compTime');
let   compMic       = document.getElementById('compMic');     // ensure below
let   compMicNote   = document.getElementById('compMicNote');

const MIN_TITLE_CHARS = 2;
let _pendingSave = false;
let _suppressBlurAdvance = false;
let _userTouchedTime = false;

/* ---------- Make sure the mic exists (bottom-center in Step 1) ---------- */
(function ensureMicInDom(){
  if (compMic && compMicNote) return;
  if (!composer || !compForm) return;
  const panel = compPanel || composer;
  if (!compMic) {
    const btn = document.createElement('button');
    btn.id = 'compMic';
    btn.type = 'button';
    btn.className = 'mic-ico';
    btn.setAttribute('aria-pressed','false');
    btn.title = 'דבר/י';
    btn.setAttribute('aria-label','דבר/י');
    btn.innerHTML = '<img src="icons/mic.svg" alt="" width="20" height="20">';
    panel.appendChild(btn);
    compMic = btn;
  }
  if (!compMicNote) {
    const note = document.createElement('div');
    note.id = 'compMicNote';
    note.className = 'mic-note';
    note.setAttribute('aria-live','polite');
    panel.appendChild(note);
    compMicNote = note;
  }
})();

/* ---------- Step management ---------- */
function setStep(n){
  if (!composer) return;
  composer.setAttribute('data-step', String(n));
  if (n===1 && compTitle) compTitle.focus();
  if (n===2 && compDate)  compDate.focus();
  if (n===3 && compTime)  {
    compTime.focus();
    // Try to open the native time picker on supported browsers
    try { compTime.showPicker && compTime.showPicker(); } catch(_) {}
  }
}

function fieldsReadyForSave(){
  const t = (compTitle?.value || '').trim();
  const d = (compDate?.value  || '').trim();
  const h = (compTime?.value  || '').trim();
  return (t.length >= MIN_TITLE_CHARS && d && h && _userTouchedTime);
}

function performSave(){
  const t=(compTitle?.value||'').trim();
  const d=(compDate?.value||'').trim();
  const h=(compTime?.value||'').trim();
  const id='t_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
  state.tasks.push({id, title:t, date:d, time:h});
  saveTasks();
  state.current = fromKey(d);
  state.view = 'day';
  render();
  compForm?.reset();
  _pendingSave = false;
  closeComposer();
}

function autoSaveComposer(){
  if (_pendingSave) return;
  if (fieldsReadyForSave()){
    _pendingSave = true;
    performSave();
  }
}

/* ---------- Open / Close ---------- */
function openComposer(){
  if(!composer) return;
  const base = state.selectedDate ? fromKey(state.selectedDate) : new Date();

  // Step 1: title
  if (compTitle){
    compTitle.value = '';
    compTitle.autocomplete='off';
    compTitle.autocapitalize='off';
    compTitle.autocorrect='off';
    compTitle.spellcheck=false;
  }

  // Step 2: prefill date (from calendar)
  if (compDate){
    compDate.autocomplete='off';
    compDate.value = dateKey(base);
  }

  // Step 3: absolutely no auto-time
  if (compTime){
    compTime.autocomplete='off';
    compTime.value = '';
    compTime.defaultValue = '';
    compTime.removeAttribute('value');
    compTime.name = 'time-'+Date.now(); // fights autofill caches
    _userTouchedTime = false;
  }

  composer.classList.remove('u-hidden'); composer.classList.add('is-open');
  composer.setAttribute('aria-hidden','false');
  _pendingSave = false;
  setStep(1);
}

function closeComposer(){
  if(!composer) return;
  composer.classList.remove('is-open'); composer.setAttribute('aria-hidden','true');
  setTimeout(()=>composer.classList.add('u-hidden'),180);
  stopMic(true);
}

compCloseBtns.forEach(b=>b.addEventListener('click', e=>{ e.preventDefault(); closeComposer(); }));
composer && composer.addEventListener('click', e=>{ if(e.target && e.target.classList.contains('composer__backdrop')) closeComposer(); });
document.addEventListener('keydown', e=>{ if (e.key==='Escape') closeComposer(); });
compForm && compForm.addEventListener('submit', (e)=>{ e.preventDefault(); autoSaveComposer(); });

/* ---------- Web Speech (he-IL) ---------- */
let _rec=null, _listening=false, _lockBySwipe=false;

function ensureRecognizer(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
  if (!isSecure || !SR) {
    if (compMicNote) compMicNote.textContent = 'זיהוי דיבור דורש דפדפן תומך ו־HTTPS.';
    return null;
  }
  if(_rec) return _rec;

  const r = new SR();
  r.lang = 'he-IL';
  r.interimResults = true;
  r.continuous = true;
  r.maxAlternatives = 1;

  r.onresult = (evt)=>{
    let finalText = '', interimText = '';
    for (let i = evt.resultIndex; i < evt.results.length; i++){
      const res = evt.results[i];
      if (res.isFinal) finalText += res[0].transcript;
      else interimText += res[0].transcript;
    }
    const base = (compTitle?.value ? compTitle.value.replace(/\s+$/,'') : '');
    const next = (base + ' ' + (finalText || interimText)).trim();
    if (compTitle) compTitle.value = next;
    if (compMicNote) compMicNote.textContent = _lockBySwipe ? 'הקלטה (נעול)' : 'דבר/י…';
  };

  r.onerror = (e)=>{
    if (compMicNote) compMicNote.textContent =
      (e?.error === 'not-allowed') ? 'גישה למיקרופון נדחתה.' :
      (e?.error === 'no-speech')   ? 'לא זוהה דיבור.' :
      'שגיאת מיקרופון.';
    try{ r.stop(); }catch(_){}
  };

  r.onend = ()=>{
    if (_listening || _lockBySwipe) setTimeout(()=>{ try{ r.start(); }catch(_){} }, 120);
  };

  _rec = r;
  return r;
}
function safeStart(r){ try{ r.start(); }catch(_){ try{ r.stop(); }catch(_){ } setTimeout(()=>{ try{ r.start(); }catch(_){} }, 120); } }
function startMic(){
  const r = ensureRecognizer();
  if(!r){ if(compMicNote) compMicNote.textContent='הדפדפן לא תומך בזיהוי דיבור.'; return; }
  if(_listening) return;
  _listening = true;
  compMic?.setAttribute('aria-pressed','true');
  compMic?.classList.add('is-on');
  if(compMicNote) compMicNote.textContent = _lockBySwipe ? 'הקלטה (נעול)' : 'דבר/י…';
  safeStart(r);
  navigator.mediaDevices?.getUserMedia?.({audio:true}).catch(()=>{}).finally(()=> safeStart(r));
}
function stopMic(forceNote){
  if(!_listening){ maybeAdvanceFromTitle('mic'); return; }
  _listening = false;
  compMic?.setAttribute('aria-pressed','false');
  compMic?.classList.remove('is-on');
  try{ _rec && _rec.stop(); }catch(_){}
  if(!forceNote && compMicNote) compMicNote.textContent='';
  maybeAdvanceFromTitle('mic');
}

/* ---------- Mic gestures ---------- */
let _micPointerId=null, _micDownY=0;
if (compMic){
  compMic.addEventListener('pointerdown', (e)=>{
    _suppressBlurAdvance = true;
    e.preventDefault();
    if(_micPointerId!==null) return;
    _micPointerId = e.pointerId ?? 1;
    compMic.setPointerCapture?.(_micPointerId);
    _lockBySwipe = false;
    _micDownY = e.clientY ?? (e.touches?.[0]?.clientY) ?? 0;
    compTitle?.focus();
    startMic();
    setTimeout(()=>{ _suppressBlurAdvance = false; }, 300);
  });
  compMic.addEventListener('pointermove', (e)=>{
    if(_micPointerId===null) return;
    const y = e.clientY ?? (e.touches?.[0]?.clientY) ?? 0;
    if(!_lockBySwipe && (y - _micDownY) > 30){
      _lockBySwipe = true;
      compMicNote && (compMicNote.textContent = 'הקלטה (נעול)');
    }
  });
  compMic.addEventListener('pointerup', ()=>{ if(!_lockBySwipe) stopMic(true); _micPointerId = null; });
  compMic.addEventListener('click', (e)=>{ e.preventDefault(); if(_listening){ _lockBySwipe=false; stopMic(true);} else { _lockBySwipe=true; startMic(); } });
}

/* ---------- Tap-anywhere advance rules ---------- */
// Step 1 → Step 2: tap anywhere except title/mic (with text present)
document.addEventListener('pointerdown', (e)=>{
  if (!composer || !composer.classList.contains('is-open')) return;
  const step = Number(composer.getAttribute('data-step')||1);
  if (step !== 1) return;
  const t = (compTitle?.value || '').trim();
  if (t.length < MIN_TITLE_CHARS) return;
  const isTitle = e.target.closest?.('#compTitle');
  const isMic   = e.target.closest?.('#compMic');
  if (!isTitle && !isMic) setStep(2);
}, {capture:true});

// NEW: Step 2 → Step 3 options:
// A) User actually changes the date (change event)
// B) OR user taps anywhere outside the date input and a date value already exists (prefilled path)
document.addEventListener('pointerdown', (e)=>{
  if (!composer || !composer.classList.contains('is-open')) return;
  const step = Number(composer.getAttribute('data-step')||1);
  if (step !== 2) return;
  const isDate = e.target.closest?.('#compDate');
  if (isDate) return; // let the picker open
  const hasDate = !!(compDate && compDate.value);
  if (hasDate) setStep(3);
}, {capture:true});

// Change on date → go to time
compDate && compDate.addEventListener('change', ()=>{ if (compDate.value) setStep(3); });

/* ---------- Time events (save only after real user action) ---------- */
if (compTime){
  compTime.addEventListener('focus', ()=>{
    if(!_userTouchedTime && compTime.value){ compTime.value=''; }
  });
  compTime.addEventListener('input', ()=>{ _userTouchedTime = true; });
  compTime.addEventListener('change', ()=>{ _userTouchedTime = true; autoSaveComposer(); });
  compTime.addEventListener('blur',   ()=>{ if (_userTouchedTime) autoSaveComposer(); });
}

/* ---------- Title events ---------- */
function maybeAdvanceFromTitle(origin){
  const t = (compTitle?.value || '').trim();
  if ((origin === 'enter' || origin === 'blur' || origin === 'mic') && t.length >= MIN_TITLE_CHARS){
    setStep(2);
  }
}
compTitle && compTitle.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') { e.preventDefault(); maybeAdvanceFromTitle('enter'); } });
compTitle && compTitle.addEventListener('blur',   ()=>{ if (!_suppressBlurAdvance) maybeAdvanceFromTitle('blur'); });



  /* ===================== Effects & tiny inline fix ===================== */
  function blastConfetti(x,y,scale){
    const layer = document.createElement('div'); layer.className='fx-confetti'; document.body.appendChild(layer);
    const N=110;
    for (let i=0;i<N;i++){
      const s=document.createElement('span'); s.className='fx-c'; s.style.left=x+'px'; s.style.top=y+'px';
      s.style.setProperty('--dx', (Math.random()*2-1)*200*scale+'px');
      s.style.setProperty('--dy', (-Math.random()*240)*scale+'px');
      s.style.setProperty('--r',  (Math.random()*720)+'deg');
      s.style.setProperty('--t',  (600+Math.random()*700)+'ms');
      layer.appendChild(s);
    }
    setTimeout(()=>layer.remove(),1600);
  }
  const prev = document.getElementById('looz-fixes-v12'); if (prev) prev.remove();
  const style = document.createElement('style');
  style.id = 'looz-fixes-v12';
  style.textContent = `.p-weekbar__title,.p-monthbar__title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`;
  document.head.appendChild(style);

  /* ===================== Initial ===================== */
  const _today = new Date();
  state.current = _today;
  state.selectedDate = dateKey(_today);
  formatTitle(_today);
  render();

  (function ensureFirstNameAndGreeting() {
    try {
      const prof = JSON.parse(localStorage.getItem('profile') || '{}');
      const au   = JSON.parse(localStorage.getItem('authUser') || 'null');
      if (!prof.firstName) {
        const guess = (prof.name || (au && au.displayName) || '').split(' ')[0];
        if (guess) { prof.firstName = guess; localStorage.setItem('profile', JSON.stringify(prof)); }
      }
      const greetEl = document.querySelector('#greeting');
      if (greetEl && prof.firstName) { greetEl.textContent = `שלום, ${prof.firstName}!`; }
    } catch (e) { console.warn("Greeting setup failed", e); }
  })();
})();
