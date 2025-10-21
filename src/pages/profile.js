// src/pages/profile.js
// פרופיל – אלגנטי, ממוקד, עם אייקוני מצלמה קטנים לשינוי תמונות

import profileLogo from '../icons/profile-logo.png';

const $ = (s, r = document) => r.querySelector(s);

const K = {
  AVATAR:     'profile.avatar',
  COVER:      'profile.cover',
  NAME:       'firstName',
  SUR:        'lastName',
  HANDLE:     'profile.handle',
  FOLLOWERS:  'profile.followers',
  FOLLOWING:  'profile.following',
  IS_FOLLOW:  'profile.is_followed',
};

const esc = v => (window.CSS && CSS.escape ? CSS.escape(v) : String(v));

function fullName() {
  const f = localStorage.getItem(K.NAME) || 'אורח';
  const l = localStorage.getItem(K.SUR)  || '';
  return l ? `${f} ${l}` : f;
}
function handle() { return localStorage.getItem(K.HANDLE) || '@looz_user'; }
function read(key, def=''){ try { return localStorage.getItem(key) ?? def; } catch { return def; } }
function write(key, val){ try { localStorage.setItem(key, val); } catch {} }

/* ---------- סטטיסטיקות משימות ---------- */
function readItems(){
  const keys = ['events','tasks','todos','items'];
  const out = [];
  for (const k of keys){
    try { const a = JSON.parse(localStorage.getItem(k) || '[]'); if (Array.isArray(a)) out.push(...a); } catch {}
  }
  return out;
}
function computeStats(){
  const items = readItems();
  const total = items.length;
  const done  = items.filter(i => i.done || i.status === 'done' || i.completed).length;
  const del   = items.filter(i => i.deleted || i.status === 'deleted').length;

  // 7 ימים אחרונים (מימין לשמאל; היום בסוף)
  const buckets = Array.from({length:7}, (_,i)=>({d:i, n:0}));
  const now = new Date();
  for (const it of items){
    const d = new Date(it.date || it.dateKey || it.start || it.createdAt || Date.now());
    const diff = Math.floor((now - d) / 86400000);
    if (diff >= 0 && diff < 7) buckets[6 - diff].n++;
  }
  return { total, done, del, buckets };
}
function sparkPath(series, w=268, h=64, pad=8){
  const max  = Math.max(1, ...series.map(s => s.n));
  const step = (w - pad*2) / (series.length - 1);
  const y    = n => h - pad - (n / max) * (h - pad*2);
  return series.map((s,i) => `${i ? 'L' : 'M'} ${pad + i*step},${y(s.n)}`).join(' ');
}

/* ---------- תבנית ---------- */
function template(){
  // ודא שמונים קיימים
  if (localStorage.getItem(K.FOLLOWERS) == null) write(K.FOLLOWERS, '0');
  if (localStorage.getItem(K.FOLLOWING) == null) write(K.FOLLOWING, '0');

  const cover   = read(K.COVER, '');
  const avatar  = read(K.AVATAR, '');
  const isOn    = read(K.IS_FOLLOW, '0') === '1';
  const { total, done, del, buckets } = computeStats();
  const path = sparkPath(buckets);

  return `
  <main class="profile-page o-wrap" dir="rtl">

    <header class="topbar">
      <button class="navbtn" data-act="back" aria-label="חזרה">‹</button>
      <h1 class="title">פרופיל</h1>
      <button class="looz-mini-btn" data-act="home" aria-label="עמוד ראשי">
        <img class="looz-mini" src="${profileLogo}" alt="LooZ" />
      </button>
    </header>

    <!-- קאבר -->
    <section class="pp-cover" style="${cover ? `--cover:url(${esc(cover)})` : ''}">
      <input id="ppCoverInput" type="file" accept="image/*" hidden>
      <!-- אייקון מצלמה קטן – משמאל למעלה -->
      <button class="pp-editbtn pp-editbtn--cover" type="button" data-edit="cover" aria-label="החלפת תמונת רקע">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l1 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1-2Zm3 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-2.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" fill="currentColor"/></svg>
      </button>
    </section>

    <!-- כרטיס ראש -->
    <section class="pp-card pp-head">
      <div class="pp-avatar">
        <img class="pp-avatar__img" src="${avatar}" alt="">
        <input id="ppAvatarInput" type="file" accept="image/*" hidden>
        <!-- אייקון מצלמה קטן – משמאל למטה על התמונה -->
        <button class="pp-editbtn pp-editbtn--avatar" type="button" data-edit="avatar" aria-label="החלפת תמונת פרופיל">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l1 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1-2Zm3 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-2.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" fill="currentColor"/></svg>
        </button>
      </div>

      <div class="pp-id">
        <div class="pp-name">${fullName()}</div>
        <div class="pp-handle">${handle()}</div>
      </div>

      <div class="pp-followrow">
        <button class="pp-btn pp-btn--follow ${isOn ? 'is-on' : ''}" data-act="follow">${isOn ? 'עוקב ✓' : 'עקוב'}</button>
      </div>

      <!-- מונים -->
      <div class="pp-counters" role="group" aria-label="מונה עוקבים ונעקבים">
        <div class="pp-count"><b id="ppFollowers">${Number(read(K.FOLLOWERS,'0'))}</b><span>עוקבים</span></div>
        <div class="pp-count"><b id="ppFollowing">${Number(read(K.FOLLOWING,'0'))}</b><span>נעקבים</span></div>
        <div class="pp-count"><b>${total}</b><span>משימות</span></div>
      </div>
    </section>

    <!-- סטטיסטיקה -->
    <section class="pp-card pp-stats" aria-label="סטטיסטיקה">
      <div class="pp-statrow">
        <div class="pp-stat"><span class="pp-num">${total}</span><span class="pp-lbl">סה״כ</span></div>
        <div class="pp-stat"><span class="pp-num">${done}</span><span class="pp-lbl">בוצעו</span></div>
        <div class="pp-stat"><span class="pp-num">${del}</span><span class="pp-lbl">נמחקו</span></div>
      </div>
      <svg class="pp-spark" viewBox="0 0 268 64" width="100%" height="64" aria-hidden="true">
        <defs>
          <linearGradient id="ppInk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stop-color="#FFE067"/>
            <stop offset="55%"  stop-color="#9CC6FF"/>
            <stop offset="100%" stop-color="#6EA8FF"/>
          </linearGradient>
        </defs>
        <path d="${path}" fill="none" stroke="url(#ppInk)" stroke-width="3" stroke-linecap="round"/>
      </svg>
      <div class="pp-sub">שבעת הימים האחרונים</div>
    </section>

    <!-- רשתות חברתיות – שורה אחת, אייקונים בלבד -->
    <div class="pp-socialbar" role="group" aria-label="קישורים חברתיים">
      <a class="pp-socbtn" href="#" aria-label="Facebook"  title="Facebook">
        <svg viewBox="0 0 24 24"><path d="M13 22V12h3l1-3h-4V7c0-.9.3-1.5 1.7-1.5H17V2.2c-.8-.1-1.7-.2-2.5-.2C12 2 10.9 3.7 11 6v3H8v3h3v10h2Z"/></svg>
      </a>
      <a class="pp-socbtn" href="#" aria-label="Instagram" title="Instagram">
        <svg viewBox="0 0 24 24"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm6.5-.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z"/></svg>
      </a>
      <a class="pp-socbtn" href="#" aria-label="TikTok"    title="TikTok">
        <svg viewBox="0 0 24 24"><path d="M14 3h3c.2 2 1.5 4 4 4v3c-1.7 0-3.3-.6-4.6-1.6V16a5 5 0 1 1-5-5h.6V7H14v2.8A8 8 0 0 0 21 11V8a7 7 0 0 1-7-5Z"/></svg>
      </a>
      <a class="pp-socbtn" href="#" aria-label="YouTube"  title="YouTube">
        <svg viewBox="0 0 24 24"><path d="M23 12s0-3.5-.5-5.1c-.3-1-1.2-1.8-2.2-2C18.7 4.3 12 4.3 12 4.3s-6.7 0-8.3.6c-1 .3-1.9 1-2.2 2C1 8.5 1 12 1 12s0 3.5.5 5.1c.3 1 1.2 1.8 2.2 2C5.3 19.7 12 19.7 12 19.7s6.7 0 8.3-.6c1-.3 1.9-1 2.2-2 .5-1.6.5-5.1.5-5.1ZM10 8.8l5.8 3.2L10 15.2V8.8Z"/></svg>
      </a>
      <a class="pp-socbtn" href="#" aria-label="X"        title="X">
        <svg viewBox="0 0 24 24"><path d="M3 3h3.6l5.2 7 5.8-7H22l-7.5 9.3L22 21h-3.6l-5.8-7.5L7 21H2.5l7.9-9.7L3 3Z"/></svg>
      </a>
      <a class="pp-socbtn" href="#" aria-label="LinkedIn" title="LinkedIn">
        <svg viewBox="0 0 24 24"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 8.98h3.96V21H3V8.98Zm6.49 0H13.3v1.63h.05c.6-1.13 2.06-2.33 4.24-2.33 4.54 0 5.38 2.99 5.38 6.88V21h-3.96v-5.36c0-1.28-.02-2.93-1.78-2.93-1.78 0-2.05 1.39-2.05 2.83V21H9.49V8.98Z"/></svg>
      </a>
    </div>

    <div class="pp-space"></div>
  </main>
  `;
}

/* ---------- חיווט ---------- */
function wire(root){
  document.body.setAttribute('data-view', 'profile');

  // להסתיר את ה־CTA הגלובלי במסך זה
  document.querySelectorAll('.c-bottom-cta, .c-cta, .btn-create-orb')
    .forEach(el => el.style.display = 'none');

  $('[data-act="back"]', root)?.addEventListener('click', () => history.back());
  $('[data-act="home"]', root)?.addEventListener('click', async () => {
    const { mount } = await import('./home.js');
    mount(document.getElementById('app'));
  });

  // Follow toggle
  const $followBtn = root.querySelector('[data-act="follow"]');
  const $followers = root.querySelector('#ppFollowers');
  if ($followBtn && $followers){
    const paint = () => {
      const on = read(K.IS_FOLLOW, '0') === '1';
      $followBtn.classList.toggle('is-on', on);
      $followBtn.textContent = on ? 'עוקב ✓' : 'עקוב';
    };
    paint();

    $followBtn.addEventListener('click', () => {
      const was = read(K.IS_FOLLOW, '0') === '1';
      write(K.IS_FOLLOW, was ? '0' : '1');
      const cur  = Number(read(K.FOLLOWERS,'0'));
      const next = was ? Math.max(0, cur - 1) : cur + 1;
      write(K.FOLLOWERS, String(next));
      $followers.textContent = String(next);
      paint();
    });
  }

  // העלאת תמונות – באמצעות אייקוני המצלמה הקטנים
  root.querySelector('[data-edit="cover"]')?.addEventListener('click', () =>
    $('#ppCoverInput', root)?.click()
  );
  root.querySelector('[data-edit="avatar"]')?.addEventListener('click', () =>
    $('#ppAvatarInput', root)?.click()
  );

  $('#ppCoverInput', root)?.addEventListener('change', async e => {
    const f = e.target.files?.[0]; if (!f) return;
    const data = await fileToDataURL(f);
    write(K.COVER, data);
    root.querySelector('.pp-cover')?.setAttribute('style', `--cover:url(${esc(data)})`);
  });
  $('#ppAvatarInput', root)?.addEventListener('change', async e => {
    const f = e.target.files?.[0]; if (!f) return;
    const data = await fileToDataURL(f);
    write(K.AVATAR, data);
    root.querySelector('.pp-avatar__img')?.setAttribute('src', data);
  });
}

function fileToDataURL(file){
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

export function mount(root){
  const target = root || document.getElementById('app') || document.body;
  target.innerHTML = template();
  wire(target);
}
export default { mount };
