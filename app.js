/* ===== LooZ — Planner App (home) — vFinal.9 with Composer + Pencil ===== */
(function () {
  'use strict';

  /* -------- AUTH GUARD (runs before anything else) -------- */
  (function guard() {
    try {
      var u = localStorage.getItem('authUser') || localStorage.getItem('auth.user');
      if (!u) { location.replace('auth.html'); }
    } catch (_) { location.replace('auth.html'); }
  })();

  /* ===================== Helpers ===================== */
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
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

  const btnProfile    = $('#btnProfile');
  const btnMenu       = $('#btnMenu');
  const btnCategories = $('#btnCategories');
  const btnSocial     = $('#btnSocial');
  if (btnProfile)    btnProfile.addEventListener('click', () => go('profile.html'));
  if (btnMenu)       btnMenu.addEventListener('click', () => go('settings.html'));
  if (btnCategories) btnCategories.addEventListener('click', () => go('categories.html'));
  if (btnSocial)     btnSocial.addEventListener('click', () => go('social.html'));

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
  function getAuth() {
    try { const raw = localStorage.getItem('authUser') || localStorage.getItem('auth.user'); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }
  function getProfile() {
    try { return JSON.parse(localStorage.getItem('profile') || '{}'); } catch { return {}; }
  }
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
    const isSpecial = au && String(au.email||'').toLowerCase()===SPECIAL_EMAIL.toLowerCase();

    if (subtitleEl) {
      subtitleEl.innerHTML = isSpecial
        ? '<div style="font-weight:800;margin-bottom:.15rem">נשמולית שלי</div>'
          + '<div>איזה כיף שחזרת <strong>'+name+'</strong></div>'
          + '<div>לוז מושלם מחכה לך</div>'
        : 'ברוכים השבים, <strong id="uiName">'+name+'</strong>!<br>מה בלוז היום?';
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

  let state = { view: (prefs.defaultView || 'month'), current: new Date(), tasks: loadTasks() };

  const formatTitle = (d) => {
    if (titleDay)  titleDay.textContent  = HEB_DAYS[d.getDay()];
    if (titleDate) titleDate.textContent = `${pad2(d.getDate())}.${pad2(d.getMonth()+1)}.${d.getFullYear()}`;
  };
  const markToday = () => { titleBadge && titleBadge.setAttribute('data-today','1'); };

  /* ===================== Lemon nav open/close ===================== */
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
      void navPanel.offsetHeight;
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
    let b = n<=0 ? 0 : Math.min(6, Math.floor((n-1)/3)+1);
    const tones = [
      { fg:'#475569', ring:'#e5e7eb' }, // 0
      { fg:'#0ea5e9', ring:'#93c5fd' }, // 1
      { fg:'#16a34a', ring:'#86efac' }, // 2
      { fg:'#f59e0b', ring:'#fde68a' }, // 3
      { fg:'#a855f7', ring:'#ddd6fe' }, // 4
      { fg:'#db2777', ring:'#fbcfe8' }, // 5
      { fg:'#1d4ed8', ring:'#bfdbfe' }, // 6
    ];
    return {band:b, ...tones[b]};
  }

  /* ===================== Renderers ===================== */
  function render(){
    formatTitle(state.current); markToday();
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

  // Hook the static create-orb button → open the fullscreen composer
  if (createOrbBtn) {
    createOrbBtn.addEventListener('click', (e) => { e.preventDefault(); openComposer(); });
  }

  if (plannerRoot){
    plannerRoot.addEventListener('click', (e)=>{
      const openBtn = e.target && e.target.closest('[data-open]');
      if (openBtn){
        const dayKey = openBtn.getAttribute('data-open');
        state._openWeek = (state._openWeek===dayKey) ? null : dayKey;
        render(); return;
      }
      const hostGoto = e.target && e.target.closest('[data-goto]');
      if (hostGoto && !e.target.closest('[data-open]')){
        state.current = fromKey(hostGoto.dataset.goto);
        state.view = 'day'; render(); return;
      }
      const doneId = e.target && e.target.getAttribute('data-done');
      const delId  = e.target && e.target.getAttribute('data-del');
      function bumpStat(kind){
        try {
          const k = 'loozStats';
          const o = JSON.parse(localStorage.getItem(k) || '{"doneTotal":0,"removedTotal":0}');
          if (kind === 'done')    o.doneTotal    = (o.doneTotal||0) + 1;
          if (kind === 'removed') o.removedTotal = (o.removedTotal||0) + 1;
          localStorage.setItem(k, JSON.stringify(o));
        } catch(_) {}
      }
      if (doneId){
        bumpStat('done');
        blastConfetti(e.clientX||0, e.clientY||0, 1.0);
        state.tasks = state.tasks.filter(t=>t.id!==doneId);
        saveTasks(); render();
      } else if (delId){
        bumpStat('removed');
        const row = e.target.closest('.p-task,.p-daytask');
        if (row){
          row.classList.add('is-scratching');
          setTimeout(()=>{ state.tasks = state.tasks.filter(t=>t.id!==delId); saveTasks(); render(); }, 520);
        } else {
          state.tasks = state.tasks.filter(t=>t.id!==delId); saveTasks(); render();
        }
      }
    });
  }

  /* ===================== Bottom Sheet (kept) ===================== */
  function openSheet(){
    if (!sheet) return;
    const now = new Date();
    if (dateInput && !dateInput.value) dateInput.value = dateKey(now);
    if (timeInput && !timeInput.value) timeInput.value = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    sheet.classList.remove('u-hidden'); sheet.classList.add('is-open');
    try { titleInput && titleInput.focus(); } catch {}
  }
  function closeSheet(){ if (!sheet) return; sheet.classList.remove('is-open'); setTimeout(()=>sheet.classList.add('u-hidden'), 220); }

  if (sheet){
    sheetClose && sheetClose.addEventListener('click', e=>{ e.preventDefault(); closeSheet(); });
    sheetPanel && sheetPanel.addEventListener('click', (e)=>{
      const qd = e.target && e.target.closest('.qp__chip[data-date]');
      if (qd){
        e.preventDefault();
        const kind = qd.getAttribute('data-date');
        const base = new Date();
        if (kind==='tomorrow') base.setDate(base.getDate()+1);
        else if (kind==='nextweek') base.setDate(base.getDate()+7);
        else if (/^\+\d+$/.test(kind)) base.setDate(base.getDate()+parseInt(kind.slice(1),10));
        if (dateInput) dateInput.value = dateKey(base);
        return;
      }
      const qt = e.target && e.target.closest('.qp__chip[data-time]');
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

  sheetForm && sheetForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const t = (titleInput && titleInput.value || '').trim();
    const d = (dateInput  && dateInput.value  || '').trim();
    const h = (timeInput  && timeInput.value  || '').trim();
    if (!t || !d || !h) return;
    const id = 't_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
    state.tasks.push({ id, title:t, date:d, time:h });
    saveTasks();
    state.current = fromKey(d); state.view='day';
    render(); sheetForm.reset(); closeSheet();
  });

/* ===================== Fullscreen Composer (single, corrected) ===================== */
const composer      = document.getElementById('eventComposer');
const compPanel     = composer ? composer.querySelector('.composer__panel') : null;
const compCloseBtns = composer ? composer.querySelectorAll('[data-close]') : [];
const compForm      = document.getElementById('composerForm');
const compTitle     = document.getElementById('compTitle');
const compDate      = document.getElementById('compDate');
const compTime      = document.getElementById('compTime');
const compMic       = document.getElementById('compMic');
const compMicNote   = document.getElementById('compMicNote');
const compPencil    = document.getElementById('compPencil');

const MIN_TITLE_CHARS = 2; // do NOT advance on a single char

/* ---------- hidden mirror for caret width ---------- */
const _mirror = document.createElement('div');
_mirror.style.cssText = [
  'position:absolute','visibility:hidden','white-space:pre','pointer-events:none',
  'top:-9999px','right:-9999px'
].join(';');
document.body.appendChild(_mirror);

function _copyInputStyles(src, dst){
  const cs = getComputedStyle(src);
  const props = ['fontFamily','fontSize','fontWeight','letterSpacing','textTransform','padding','border','boxSizing','direction'];
  props.forEach(p => dst.style[p] = cs[p]);
  dst.style.width = cs.width;
}

function updatePencilAnchor(){
  if (!composer || !compPencil || !compTitle || !compPanel) return;

  const step = Number(composer.getAttribute('data-step')||1);
  const input = (step === 1 ? compTitle : null);
  if (!input) { compPencil.style.display='none'; return; }

  const inputRect = input.getBoundingClientRect();
  const panelRect = compPanel.getBoundingClientRect();

  _copyInputStyles(input, _mirror);

  const cs = getComputedStyle(input);
  const isRTL    = (cs.direction === 'rtl');
  const padStart = parseFloat(isRTL ? cs.paddingRight : cs.paddingLeft) || 0;

  const val   = input.value || '';
  const caret = input.selectionStart ?? val.length;

  _mirror.textContent = val.slice(0, caret);
  const w = _mirror.getBoundingClientRect().width;

  const MIN_INSET = 6;
  const xAbs = (val.length === 0)
    ? (isRTL ? (inputRect.right - padStart - MIN_INSET)
             : (inputRect.left  + padStart + MIN_INSET))
    : (isRTL ? (inputRect.right - padStart - w)
             : (inputRect.left  + padStart + w));

  // viewport → panel-relative
  const x = Math.round(xAbs - panelRect.left) - 2;
  const y = Math.round(inputRect.top - panelRect.top + inputRect.height/2);

  compPencil.style.display = 'block';
  compPencil.style.left = x + 'px';
  compPencil.style.top  = y + 'px';
}

function updateMicAnchor(){
  if (!composer || !compMic || !compTitle || !compPanel) return;
  const step = Number(composer.getAttribute('data-step')||1);
  if (step !== 1) { compMic.style.display = 'none'; return; }

  const inputRect = compTitle.getBoundingClientRect();
  const panelRect = compPanel.getBoundingClientRect();

  const centerX = Math.round(panelRect.width / 2);
  const topY    = Math.round(inputRect.bottom - panelRect.top + 21); // Fibonacci 21px

  compMic.style.display = 'inline-grid';
  compMic.style.left = centerX + 'px';
  compMic.style.top  = topY + 'px';
  compMic.style.transform = 'translate(-50%,0)';
}



/* ---------- step flow ---------- */
function setStep(n){
  if (!composer) return;
  composer.setAttribute('data-step', String(n));
  if (n===1 && compTitle) compTitle.focus();
  if (n===2 && compDate)  compDate.focus();
  if (n===3 && compTime)  compTime.focus();
  updatePencilAnchor(); updateMicAnchor();
}

function maybeAdvanceFromTitle(origin){
  const t = (compTitle && compTitle.value || '').trim();
  const ok =
    (origin === 'enter') ||
    ((origin === 'blur' || origin === 'mic') && t.length >= MIN_TITLE_CHARS);
  if (ok) setStep(2);
}

function maybeAdvanceFromDate(){
  const d = (compDate && compDate.value || '').trim();
  if (d) setStep(3);
}

/* ---------- open/close ---------- */
function openComposer(){
  if(!composer) return;
  const now = new Date();
  if(compDate && !compDate.value) compDate.value = dateKey(now);
  if(compTime && !compTime.value) compTime.value = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  composer.classList.remove('u-hidden');
  composer.classList.add('is-open');
  composer.setAttribute('aria-hidden','false');
  setStep(1);
  try { compTitle && compTitle.focus(); } catch {}
  requestAnimationFrame(()=>{ updatePencilAnchor(); updateMicAnchor(); });
}

function closeComposer(){
  if(!composer) return;
  composer.classList.remove('is-open');
  composer.setAttribute('aria-hidden','true');
  setTimeout(()=>composer.classList.add('u-hidden'),180);
  stopMic(true);
}

/* ---------- hooks ---------- */
createOrbBtn && createOrbBtn.addEventListener('click', e=>{ e.preventDefault(); openComposer(); });
compCloseBtns.forEach(b=>b.addEventListener('click', e=>{ e.preventDefault(); closeComposer(); }));
composer && composer.addEventListener('click', e=>{
  if(e.target && e.target.classList.contains('composer__backdrop')) closeComposer();
});
document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && composer && composer.classList.contains('is-open')) closeComposer();
});

/* ---------- save ---------- */
compForm && compForm.addEventListener('submit', e=>{
  e.preventDefault();
  const t=(compTitle&&compTitle.value||'').trim();
  const d=(compDate&&compDate.value||'').trim();
  const h=(compTime&&compTime.value||'').trim();
  if(!t||!d||!h) return;
  const id='t_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
  state.tasks.push({id, title:t, date:d, time:h});
  saveTasks();
  state.current = fromKey(d);
  state.view = 'day';
  render();
  const primary = document.querySelector('#eventComposer .c-btn--primary');
  if(primary){ primary.classList.add('is-rippling'); setTimeout(()=>primary.classList.remove('is-rippling'),420); }
  compForm.reset();
  closeComposer();
});

/* ---------- Web Speech ---------- */
let _rec=null, _listening=false, _lockBySwipe=false;

function ensureRecognizer(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR) return null;
  if(_rec) return _rec;
  const r=new SR();
  r.lang='he-IL'; r.interimResults=true; r.continuous=false; r.maxAlternatives=1;
  r.onresult=(evt)=>{
    let txt=''; for(let i=evt.resultIndex;i<evt.results.length;i++) txt+=evt.results[i][0].transcript;
    if(compTitle) compTitle.value = txt.trim();
    if(compMicNote) compMicNote.textContent='מזהה דיבור...';
    updatePencilAnchor(); // keep the pencil on the caret while dictating
  };
  r.onerror=()=>{ if(compMicNote) compMicNote.textContent='שגיאת מיקרופון.'; stopMic(true); };
  r.onend=()=>{ if(!_lockBySwipe) stopMic(); };
  _rec=r; return r;
}

function startMic(){
  const r=ensureRecognizer();
  if(!r){ if(compMicNote) compMicNote.textContent='הדפדפן לא תומך בזיהוי דיבור.'; return; }
  if(_listening) return;
  _listening=true;
  compMic && compMic.setAttribute('aria-pressed','true');
  compMic && compMic.classList.add('is-on');
  compPencil && compPencil.classList.add('is-on');
  if(compMicNote) compMicNote.textContent = _lockBySwipe ? 'הקלטה (נעול)' : 'התחל/י לדבר...';
  try{ r.start(); }catch(_){}
}

function stopMic(forceNote){
  if(!_listening){ maybeAdvanceFromTitle('mic'); return; }
  _listening=false;
  compMic && compMic.setAttribute('aria-pressed','false');
  compMic && compMic.classList.remove('is-on');
  compPencil && compPencil.classList.remove('is-on');
  try{ _rec && _rec.stop(); }catch(_){}
  if(!forceNote && compMicNote) compMicNote.textContent='';
  maybeAdvanceFromTitle('mic'); // advance only if we now have ≥ MIN_TITLE_CHARS
}

/* mic click */
compMic && compMic.addEventListener('click', e=>{
  e.preventDefault();
  if(_listening){ _lockBySwipe=false; stopMic(true); }
  else { _lockBySwipe=false; startMic(); }
});

/* ---------- pencil: hold to start, swipe-down to lock ---------- */
window.addEventListener('resize', ()=>{ updatePencilAnchor(); updateMicAnchor(); });
window.addEventListener('orientationchange', ()=>{ updatePencilAnchor(); updateMicAnchor(); });

[compTitle, compDate, compTime].forEach(inp=>{
  if(!inp) return;
  inp.addEventListener('focus', ()=>{ updatePencilAnchor(); updateMicAnchor(); });
  inp.addEventListener('input', ()=>{ updatePencilAnchor(); updateMicAnchor(); }); // no auto-advance
  inp.addEventListener('click', ()=>{ updatePencilAnchor(); updateMicAnchor(); });
  inp.addEventListener('keyup', ()=>{ updatePencilAnchor(); updateMicAnchor(); });
  inp.addEventListener('blur', ()=> setTimeout(()=>{ if(Number(composer.getAttribute('data-step')||1)!==1 && compPencil) compPencil.style.display='none'; }, 0));
});

/* Enter → advance; blur → advance only if ≥2 chars */
compTitle && compTitle.addEventListener('keydown', (e)=>{
  if (e.key === 'Enter') { e.preventDefault(); maybeAdvanceFromTitle('enter'); }
});
compTitle && compTitle.addEventListener('blur', ()=> maybeAdvanceFromTitle('blur'));
compDate  && compDate.addEventListener('change', maybeAdvanceFromDate);
compDate  && compDate.addEventListener('blur',   maybeAdvanceFromDate);

/* swipe/hold on the pencil */
let holdTimer=null, startY=0, moved=false;
function beginHold(y){
  clearTimeout(holdTimer);
  holdTimer=setTimeout(()=>{ _lockBySwipe=false; startMic(); },360);
  startY=y; moved=false;
}
function endHold(){
  clearTimeout(holdTimer);
  if(_listening && !_lockBySwipe) stopMic(true);
}
compPencil && compPencil.addEventListener('pointerdown', e=>{ compPencil.setPointerCapture(e.pointerId); beginHold(e.clientY); });
compPencil && compPencil.addEventListener('pointermove', e=>{
  if(!startY) return;
  const dy=e.clientY-startY;
  if(dy>52){ _lockBySwipe=true; if(!_listening) startMic(); if(compMicNote) compMicNote.textContent='הקלטה (נעול)'; startY=0; moved=true; clearTimeout(holdTimer); }
});
compPencil && compPencil.addEventListener('pointerup', ()=>{ if(!moved) endHold(); startY=0; moved=false; });
compPencil && compPencil.addEventListener('pointercancel', ()=>{ clearTimeout(holdTimer); startY=0; moved=false; });
compPencil && compPencil.addEventListener('click', ()=>{ if(_lockBySwipe && _listening){ _lockBySwipe=false; stopMic(true); } });

  /* ===================== Effects & INLINE CSS (tiny keep) ===================== */
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

  // small safety style injection kept
  const prev = document.getElementById('looz-fixes-v12'); if (prev) prev.remove();
  const style = document.createElement('style');
  style.id = 'looz-fixes-v12';
  style.textContent = `.p-weekbar__title,.p-monthbar__title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`;
  document.head.appendChild(style);

  /* ===================== Initial ===================== */
  const _today = new Date();
  state.current = _today;
  formatTitle(_today);
  render();

// Ensure firstName exists + greeting update (kept)
(function ensureFirstNameAndGreeting() {
  try {
    var prof = JSON.parse(localStorage.getItem('profile') || '{}');
    var au   = JSON.parse(localStorage.getItem('authUser') || 'null');

    if (!prof.firstName) {
      var guess = (prof.name || (au && au.displayName) || '').split(' ')[0];
      if (guess) {
        prof.firstName = guess;
        localStorage.setItem('profile', JSON.stringify(prof));
      }
    }

    // Update greeting section if available
    var greetEl = document.querySelector('#greeting');
    if (greetEl && prof.firstName) {
      greetEl.textContent = `שלום, ${prof.firstName}!`;
    }
  } catch (e) {
    console.warn("Greeting setup failed", e);
  }
})();
})();

