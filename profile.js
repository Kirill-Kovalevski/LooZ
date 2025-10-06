(function () {
  'use strict';

  /* ===== helpers ===== */
  const $   = (sel, root=document) => root.querySelector(sel);
  const $id = (id) => document.getElementById(id);
  const num = (k, d=0) => {
    const n = parseInt(localStorage.getItem(k)||'', 10);
    return Number.isFinite(n) ? n : d;
  };
  const setNum = (k, v) => localStorage.setItem(k, String(Math.max(0, v|0)));

  /* ===== auth/profile data (from your app) ===== */
  function getAuth(){
    try {
      const raw = localStorage.getItem('authUser') || localStorage.getItem('auth.user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function getProfile(){
    try { return JSON.parse(localStorage.getItem('profile')||'{}'); }
    catch { return {}; }
  }

  const prof = getProfile();
  const auth = getAuth() || {};
  const name   = prof.firstName || prof.name || auth.firstName || auth.name || 'דניאלה';
  const handle = (auth.email ? '@'+auth.email.split('@')[0] : (prof.handle || '@user'));

  if ($id('prName'))   $id('prName').textContent   = name;
  if ($id('prHandle')) $id('prHandle').textContent = handle;

  if (prof.city || prof.country) {
    const locEl = $('#prLocation span');
    if (locEl) locEl.textContent = (prof.city||'') + (prof.country ? ', ' + prof.country : '');
  }

  /* ===== Cover (background) upload ===== */
  const coverBtn  = $id('prCoverBtn');
  const coverFile = $id('prCoverFile');

  function setCover(dataUrl){
    if (!coverBtn) return;
    coverBtn.style.backgroundImage   = `url("${dataUrl}")`;
    coverBtn.style.backgroundSize    = 'cover';
    coverBtn.style.backgroundPosition= 'center';
  }
  (function loadCover(){
    const saved = localStorage.getItem('profileCover');
    if (saved) setCover(saved);
  })();
  if (coverBtn && coverFile){
    coverBtn.addEventListener('click', ()=> coverFile.click());
    coverFile.addEventListener('change', ()=>{
      const f = coverFile.files && coverFile.files[0]; if(!f) return;
      const rd = new FileReader();
      rd.onload = e => {
        const dataUrl = e.target.result;
        setCover(dataUrl);
        localStorage.setItem('profileCover', dataUrl);
      };
      rd.readAsDataURL(f);
    });
  }

  /* ===== Avatar upload ===== */
  const avatarBtn  = $id('prAvatarBtn');
  const avatarImg  = $id('prAvatar');
  const avatarFile = $id('prAvatarFile');

  function setAvatar(dataUrl){
    if (avatarImg) avatarImg.style.backgroundImage = `url("${dataUrl}")`;
  }
  (function loadAvatar(){
    const saved = localStorage.getItem('profileAvatar');
    if (saved) setAvatar(saved);
  })();
  if (avatarBtn && avatarFile){
    avatarBtn.addEventListener('click', ()=> avatarFile.click());
    avatarFile.addEventListener('change', ()=>{
      const f = avatarFile.files && avatarFile.files[0]; if(!f) return;
      const rd = new FileReader();
      rd.onload = e => {
        const dataUrl = e.target.result;
        setAvatar(dataUrl);
        localStorage.setItem('profileAvatar', dataUrl);
      };
      rd.readAsDataURL(f);
    });
  }

  /* ===== Social: follow/followers/etc ===== */
  const KEY_FOLLOWED   = 'looz:isFollowing';
  const KEY_FOLLOWERS  = 'looz:followers';
  const KEY_FOLLOWING  = 'looz:following';
  const KEY_SUBSCRIBES = 'looz:subscribers';
  const KEY_POSTS      = 'looz:posts';

  if (localStorage.getItem(KEY_FOLLOWERS)  == null) setNum(KEY_FOLLOWERS,  9);
  if (localStorage.getItem(KEY_FOLLOWING)  == null) setNum(KEY_FOLLOWING,  1);
  if (localStorage.getItem(KEY_SUBSCRIBES) == null) setNum(KEY_SUBSCRIBES, 0);
  if (localStorage.getItem(KEY_POSTS)      == null) setNum(KEY_POSTS,      3);

  function renderSocial(){
    const f = $id('stFollowers');   if (f) f.textContent = num(KEY_FOLLOWERS);
    const g = $id('stFollowing');   if (g) g.textContent = num(KEY_FOLLOWING);
    const s = $id('stSubscribers'); if (s) s.textContent = num(KEY_SUBSCRIBES);
    const p = $id('stPosts');       if (p) p.textContent = num(KEY_POSTS);
  }
  renderSocial();

  const btnFollow = $id('btnFollow');
  function setFollowUI(on){
    if (!btnFollow) return;
    btnFollow.textContent = on ? 'עוקבים ✓' : 'עקוב';
    btnFollow.classList.toggle('pr-btn--primary', !on);
    btnFollow.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  let isFollowing = localStorage.getItem(KEY_FOLLOWED) === '1';
  setFollowUI(isFollowing);

  if (btnFollow){
    btnFollow.addEventListener('click', ()=>{
      isFollowing = !isFollowing;
      localStorage.setItem(KEY_FOLLOWED, isFollowing ? '1' : '0');
      setFollowUI(isFollowing);
      setNum(KEY_FOLLOWERS, num(KEY_FOLLOWERS) + (isFollowing ? 1 : -1));
      renderSocial();
    });
  }

  const btnMsg = $id('btnMessage');
  if (btnMsg){
    btnMsg.addEventListener('click', ()=>{
      if (auth.email) {
        location.href = `mailto:${auth.email}?subject=${encodeURIComponent('הודעה מהפרופיל שלך ב-LooZ')}`;
      } else {
        alert('הודעות ישירות — בקרוב ♥');
      }
    });
  }

  /* ===== Tasks & stats ===== */
  function loadEvents(){
    const raw =
      localStorage.getItem('events') ||
      localStorage.getItem('loozEvents') ||
      localStorage.getItem('plannerTasks') ||
      '[]';
    try { return JSON.parse(raw) || []; } catch { return []; }
  }

  function completionsLastDays(events, days=14){
    const today = new Date(); today.setHours(0,0,0,0);
    const arr = Array.from({length:days}, ()=>0);
    for (const ev of events){
      if (!(ev.done || ev.completed)) continue;
      const d = new Date(ev.date || ev.day || ev.d || Date.now()); d.setHours(0,0,0,0);
      const diff = Math.round((today - d) / 86400000);
      if (diff>=0 && diff<days) arr[days-1-diff]++;
    }
    return arr;
  }

  function streakDays(events){
    const has = new Set(events.filter(e=>e.done||e.completed).map(e=>String(e.date||e.day||e.d).slice(0,10)));
    let s=0, d=new Date(); d.setHours(0,0,0,0);
    for (;;){
      const key = d.toISOString().slice(0,10);
      if (has.has(key)) { s++; d.setDate(d.getDate()-1); }
      else break;
    }
    return s;
  }

  function buildTaskStats(){
    const evs = loadEvents();
    const open = []; const done = [];
    const days = new Set();

    for (const ev of evs){
      const isDone = !!(ev.done || ev.completed);
      (isDone ? done : open).push(ev);
      const d = ev.date || ev.day || ev.d;
      if (d) days.add(String(d).slice(0,10));
    }

    if ($id('stOpen'))        $id('stOpen').textContent       = open.length;
    if ($id('stDone'))        $id('stDone').textContent       = done.length;
    if ($id('stTotal'))       $id('stTotal').textContent      = evs.length;
    if ($id('stActiveDays'))  $id('stActiveDays').textContent = days.size;

    drawChart(completionsLastDays(evs, 14));
    renderBadges({done: done.length, days: days.size, streak: streakDays(evs)});
  }

  /* ===== Chart (responsive + DPR) ===== */
  const canvas = $id('prChart');
  const ctx = canvas ? canvas.getContext('2d') : null;
  let DPR = 1;

  function fitCanvas(){
    if (!canvas || !ctx) return;
    const box = canvas.parentElement.getBoundingClientRect();
    DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2)); // חד בלי להכביד
    canvas.style.width  = Math.round(box.width) + 'px';
    canvas.style.height = '220px';
    canvas.width  = Math.round(box.width * DPR);
    canvas.height = Math.round(220 * DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0); // מציירים ביחידות CSS-פיזיות
  }

  function drawChart(values){
    if (!canvas || !ctx) return;
    fitCanvas();
    const W = canvas.width  / DPR;
    const H = canvas.height / DPR;
    const pad = 22;

    ctx.clearRect(0,0,W,H);

    const lineCol = getComputedStyle(document.documentElement).getPropertyValue('--line') || '#cbd5e1';
    ctx.strokeStyle = lineCol.trim();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, H-pad); ctx.lineTo(W-pad, H-pad);
    ctx.moveTo(pad, pad);   ctx.lineTo(pad, H-pad);
    ctx.stroke();

    const max = Math.max(1, ...values);
    const stepX = (W - pad*2) / (values.length - 1);

    ctx.beginPath();
    for (let i=0;i<values.length;i++){
      const x = pad + i*stepX;
      const y = H - pad - (values[i]/max)*(H - pad*2);
      i ? ctx.lineTo(x,y) : ctx.moveTo(x,y);
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2563eb';
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, pad, 0, H-pad);
    grad.addColorStop(0, 'rgba(37,99,235,.25)');
    grad.addColorStop(1, 'rgba(37,99,235,0)');
    ctx.lineTo(W-pad, H-pad); ctx.lineTo(pad, H-pad); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    ctx.fillStyle = 'rgba(15,23,42,.08)';
    for (let i=0;i<values.length;i++){
      const x = pad + i*stepX;
      ctx.fillRect(x-1, H-pad-4, 2, 4);
    }
  }

  /* ===== Achievements ===== */
  function renderBadges({done, days, streak}){
    const list = $id('prBadges'); if (!list) return;
    list.innerHTML = '';
    const items = [];
    if (streak>=3)  items.push({icon:'🔥', label:`רצף ${streak} ימים`});
    if (done>=10)   items.push({icon:'🏅', label:'10 משימות הושלמו'});
    if (done>=25)   items.push({icon:'🥈', label:'25 משימות הושלמו'});
    if (done>=50)   items.push({icon:'🥇', label:'50 משימות הושלמו'});
    if (days>=7)    items.push({icon:'📆', label:'שבוע פעיל'});
    if (!items.length) items.push({icon:'✨', label:'בדרך להישג הראשון!'});

    for (const b of items){
      const li = document.createElement('li');
      li.innerHTML = `<div class="badge__icon" aria-hidden="true">${b.icon}</div><div class="badge__txt">${b.label}</div>`;
      list.appendChild(li);
    }
  }

  /* ===== init ===== */
  window.addEventListener('resize', ()=> drawChart(completionsLastDays(loadEvents(), 14)));
  buildTaskStats();
})();
