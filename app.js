/* ===== LooZ — Planner App (home) — vFinal.8 ===== */
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
  /* fixed months (added נובמבר) */
  const HEB_MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];

  const weekLabel = (d, weekStart) => {
    const s = startOfWeek(d, weekStart);
    const e = new Date(s); e.setDate(s.getDate()+6);
    const sM = HEB_MONTHS[s.getMonth()], eM = HEB_MONTHS[e.getMonth()];
    return (s.getMonth()===e.getMonth())
      ? `${s.getDate()}–${e.getDate()} ${sM} ${s.getFullYear()}`
      : `${s.getDate()} ${sM} – ${e.getDate()} ${eM} ${s.getFullYear()}`;
  };

  /* ===================== DOM refs ===================== */
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
  const createOrbBtn = $('.btn-create-orb');     // NEW: static “create event” orb

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
    } else { /* month */
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
  const title = `${pad2(d.getDate())}.${pad2(d.getMonth()+1)} — ${HEB_DAYS[d.getDay()]}`; // no year
  plannerRoot.appendChild(buildBar('day', title));

  // ...rest of your Day list code stays EXACTLY as-is...
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
  plannerRoot.appendChild(buildBar('week', weekLabel(state.current, weekStart)));

  // ...your existing Week grid/list code unchanged...
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

  // ...your existing Month grid code unchanged...
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

  // NEW: hook the static create-orb button to open the sheet
  if (createOrbBtn) {
    createOrbBtn.addEventListener('click', (e) => { e.preventDefault(); openSheet(); });
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

  /* ===================== Bottom Sheet ===================== */
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

  /* ===================== Logout helpers (kept) ===================== */
  function clearAuthAll(){
    try{
      ['authUser','authName','token','auth.token','auth.user','looz:justLoggedIn','looz:loggedOut']
        .forEach(k=>{ try{localStorage.removeItem(k);}catch{} try{sessionStorage.removeItem(k);}catch{} });
    } catch {}
  }
  function handleLogout(){
    window.__loozLoggingOut = true; clearAuthAll();
    try{ localStorage.setItem('looz:loggedOut','1'); }catch{}
    window.location.replace('auth.html?loggedout=1');
  }

  /* ===================== Effects & INLINE CSS (minimal) ===================== */
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

  // Update injected style (kept lean; adds single-line titles)
  const prev = document.getElementById('looz-fixes-v12'); if (prev) prev.remove();
  const style = document.createElement('style');
  style.id = 'looz-fixes-v12';
  style.textContent = `
    .p-weekbar__title,.p-monthbar__title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  `;
  document.head.appendChild(style);

  /* ===================== Initial ===================== */
  const _today = new Date();
  state.current = _today;
  formatTitle(_today);
  render();

})();

/* --- AUTH GUARD (skip on auth page) --- */
(function () {
  try {
    if (/auth\.html(?:$|\?)/.test(location.pathname)) return;
    var u = localStorage.getItem('authUser') || localStorage.getItem('auth.user');
    if (!u) location.replace('auth.html');
  } catch (_) {
    location.replace('auth.html');
  }
})();
