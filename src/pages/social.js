// /src/pages/social.js
import '../styles/views/_social.scss';

const LS = {
  POSTS:  'social.posts.v3',
  CHEERS: 'social.cheers.v1',
  AVATAR: 'profile.avatar',
  NAME:   'firstName',
  SUR:    'lastName',
};

const LIMITS = {
  TEXT_MAX:     500,
  IMAGES_MAX:   3,
  IMG_MAX_SIDE: 1600,
  IMG_QUALITY:  0.82,
};

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const nowISO = () => new Date().toISOString();
const esc = s => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

// me
function meName(){ const f=localStorage.getItem(LS.NAME)||'אורח'; const l=localStorage.getItem(LS.SUR)||''; return l?`${f} ${l}`:f; }
function meAvatar(){ return localStorage.getItem(LS.AVATAR)||''; }

// storage
function readPosts(){ try{ const arr=JSON.parse(localStorage.getItem(LS.POSTS)||'[]'); return Array.isArray(arr)?arr.map(p=>({...p,images:p.images||(p.image?[p.image]:[])})):[]; }catch{ return []; } }
function writePosts(arr){ localStorage.setItem(LS.POSTS, JSON.stringify(arr)); }
function readCheers(){ try{ return JSON.parse(localStorage.getItem(LS.CHEERS)||'{}'); }catch{ return {}; } }
function writeCheers(m){ localStorage.setItem(LS.CHEERS, JSON.stringify(m)); }

// date
function fmtFullDate(d){
  return new Intl.DateTimeFormat('he-IL', {
    weekday:'long', day:'2-digit', month:'long', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  }).format(d);
}

// icons
const ico = {
  cheer:`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 2h10l-2 5h-6L7 2Zm-3 3h3.2l-.8 2H5a3 3 0 0 0 3 3h.2a6.5 6.5 0 0 0 7.6 3.6A6.5 6.5 0 0 0 18 10h.1A3 3 0 0 0 21 7h-1.4a2 2 0 0 1-2 2h-1l-.8-2H20a4 4 0 0 0-4-4H8A4 4 0 0 0 4 5Z"/></svg>`,
  comment:`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 4h18v12H7l-4 4V4Z"/></svg>`,
  share:`<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="2.2" fill="currentColor"/><circle cx="17" cy="6" r="2.2" fill="currentColor"/><circle cx="18" cy="18" r="2.2" fill="currentColor"/><path d="M7.8 11.2 C10 9.4 13.6 7.6 15.2 6.9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8.1 12.8 C10.4 14.2 14.2 16.3 16.1 17.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  mythFeatherInk: `<svg viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <radialGradient id="halo" cx="28%" cy="14%" r="58%"><stop offset="0%" stop-color="#FFF6B8"/><stop offset="78%" stop-color="#FFE067"/><stop offset="100%" stop-color="transparent"/></radialGradient>
        <linearGradient id="gold" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffdf7a"/><stop offset="100%" stop-color="#f3c340"/></linearGradient>
        <linearGradient id="tomato" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ff7460"/><stop offset="100%" stop-color="#e4432e"/></linearGradient>
      </defs>
      <circle cx="18" cy="10" r="8" fill="url(#halo)"/>
      <path d="M26 8 C18 14, 13 24, 12 34 l6 -2 c10 -6, 12 -14, 8 -24 z" fill="url(#gold)" stroke="#7a521a" stroke-opacity=".35" stroke-width="1"/>
      <g transform="translate(22 26)">
        <ellipse cx="13" cy="12" rx="11" ry="8" fill="url(#tomato)" stroke="rgba(0,0,0,.18)" stroke-width="1"/>
        <circle cx="18" cy="12" r="2.6" fill="#0b1220"/>
        <rect x="4" y="10.2" width="8" height="3.6" rx="1.8" fill="#0b1220" opacity=".85"/>
      </g>
    </svg>`,
  image:`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm-2 10h16l-5-6-4 5-3-3-4 4Z"/></svg>`,
  title:`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 6V4h16v2h-7v14h-2V6H4Z"/></svg>`,
  close:`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12m0-12L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  send:`<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m2 21 20-9L2 3l3 7 9 2-9 2-3 7Z"/></svg>`,
};

// activity api
export function getSocialActivity(){
  const posts = readPosts();
  const likes = posts.filter(p=>readCheers()[p.id])
    .map(p=>({postId:p.id, whenISO:p.createdAt, dateKey:p.createdAt.slice(0,10), time:p.createdAt.slice(11,16), title:p.title||p.text?.slice(0,24)||'ללא כותרת'}))
    .sort((a,b)=>b.whenISO.localeCompare(a.whenISO));
  const comments = posts.flatMap(p=>(p.comments||[]).map(c=>({postId:p.id, whenISO:c.createdAt, dateKey:c.createdAt.slice(0,10), time:c.createdAt.slice(11,16), text:c.text})))
    .sort((a,b)=>b.whenISO.localeCompare(a.whenISO));
  return { likes, comments };
}

// shell
function viewShell(){
  return `
    <section class="p-social" dir="rtl">
      <header class="soc-head">
        <h1 class="soc-title">חבר׳ה <i class="soc-spark">✨</i></h1>
        <div class="soc-tabs" role="tablist">
          <button class="soc-tab is-on" data-tab="feed"  role="tab" aria-selected="true">פיד</button>
          <button class="soc-tab"        data-tab="mine" role="tab" aria-selected="false">הפרסומים שלי</button>
        </div>
      </header>
      <div class="soc-list" role="list"></div>
    </section>

    <div class="soc-fabwrap">
      <button class="soc-fab btn-social-orb" aria-label="פרסום חדש">${ico.mythFeatherInk}</button>

      <div class="soc-mini" hidden aria-hidden="true">
        <button class="soc-mini__x" data-mini="close" aria-label="סגור">${ico.close}</button>

        <div class="soc-mini__me">
          <img class="soc-mini__ava" src="${meAvatar()}" alt="">
          <div class="soc-mini__name">${meName()}</div>
        </div>

        <label class="soc-mini__label"><span class="soc-ic">${ico.title}</span>כותרת (אופציונלי)</label>
        <input class="soc-mini__title" type="text" maxlength="100" placeholder="אפשר להוסיף כותרת…">

        <textarea class="soc-mini__text" rows="3" maxlength="${LIMITS.TEXT_MAX}" placeholder="מה השגתם היום? (עד ${LIMITS.TEXT_MAX} תווים)"></textarea>

        <div class="soc-mini__bar">
          <label class="soc-mini__icon" title="תמונות (עד ${LIMITS.IMAGES_MAX})">
            <input class="soc-mini__file" type="file" accept="image/*" multiple hidden>
            ${ico.image}
          </label>
          <div class="soc-mini__spacer"></div>
          <button class="soc-mini__publish" data-mini="publish" aria-label="פרסום">${ico.mythFeatherInk}</button>
        </div>

        <div class="soc-mini__preview" hidden>
          <div class="soc-grid"></div>
        </div>
      </div>
    </div>
  `;
}

function imagesHTML(arr=[]){ return arr.map(src=>`<figure class="soc-media soc-media--wide"><img src="${src}" alt=""></figure>`).join(''); }
function commentsBlockHTML(p){
  const list = (p.comments||[]).map(c=>`
    <li class="soc-c__item">
      <div class="soc-c__head">
        <b class="soc-c__name">${esc(meName())}</b>
        <time class="soc-c__when">${fmtFullDate(new Date(c.createdAt))}</time>
      </div>
      <p class="soc-c__text">${esc(c.text)}</p>
    </li>`).join('');
  return `
    <div class="soc-comm" hidden aria-hidden="true">
      <ul class="soc-c__list">${list || ''}</ul>
      <div class="soc-c__write">
        <textarea class="soc-comm__ta" rows="2" maxlength="250" placeholder="כתבו תגובה קצרה…"></textarea>
        <button class="soc-comm__send" data-act="send-comment" aria-label="שלח תגובה">${ico.send}</button>
      </div>
    </div>`;
}
function cardHTML(p){
  const when = fmtFullDate(new Date(p.createdAt));
  return `
    <article class="soc-card" role="listitem" data-id="${p.id}">
      <header class="soc-card__head">
        <div class="soc-author">
          <img class="soc-ava" src="${p.avatar||''}" alt="">
          <div class="soc-who">
            <div class="soc-name">${p.author}</div>
            <div class="soc-when">${when}</div>
          </div>
        </div>
      </header>

      ${p.title ? `<h3 class="soc-titleline">${esc(p.title)}</h3>` : ''}

      ${p.images?.length ? imagesHTML(p.images) : ''}

      ${p.text ? `<p class="soc-body">${esc(p.text)}</p>` : ''}

      <footer class="soc-foot">
        <button class="soc-act" data-act="cheer" title="כל הכבוד" aria-label="כל הכבוד"><i>${ico.cheer}</i><b class="n">${p.cheers||0}</b></button>
        <button class="soc-act" data-act="comment" title="תגובות" aria-label="תגובות"><i>${ico.comment}</i><b class="n">${(p.comments||[]).length}</b></button>
        <button class="soc-act" data-act="share" title="שיתוף" aria-label="שיתוף"><i>${ico.share}</i></button>
      </footer>

      ${commentsBlockHTML(p)}
    </article>`;
}

// render
function renderList(root, tab='feed'){
  const host = root.querySelector('.soc-list');
  let posts = readPosts().sort((a,b)=> b.createdAt.localeCompare(a.createdAt));
  if (tab==='mine') posts = posts.filter(p=>p.author===meName());
  host.innerHTML = posts.length ? posts.map(cardHTML).join('') : `<div class="soc-empty">עוד אין פרסומים. הקליקו על הנוצה כדי לפרסם!</div>`;
}
function renderCommentsInto(card, p){
  const ul = card.querySelector('.soc-comm .soc-c__list');
  ul.innerHTML = (p.comments||[]).map(c=>`
    <li class="soc-c__item">
      <div class="soc-c__head">
        <b class="soc-c__name">${esc(meName())}</b>
        <time class="soc-c__when">${fmtFullDate(new Date(c.createdAt))}</time>
      </div>
      <p class="soc-c__text">${esc(c.text)}</p>
    </li>`).join('');
}

// compression
function fileToDataURL(file){ return new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(file); }); }
async function compressImage(file, maxSide=LIMITS.IMG_MAX_SIDE, quality=LIMITS.IMG_QUALITY){
  const url = await fileToDataURL(file);
  const img = new Image(); img.src = url; await img.decode();
  const scale = Math.min(1, maxSide/Math.max(img.width,img.height));
  const w = Math.round(img.width*scale), h = Math.round(img.height*scale);
  const canvas = document.createElement('canvas'); canvas.width=w; canvas.height=h;
  canvas.getContext('2d').drawImage(img,0,0,w,h);
  return canvas.toDataURL('image/jpeg', quality);
}

// FAB + dropdown
function wireFabAndMini(root){
  const fab  = root.querySelector('.soc-fab');
  const mini = root.querySelector('.soc-mini');
  const closeBtn   = root.querySelector('[data-mini="close"]');
  const publishBtn = root.querySelector('[data-mini="publish"]');
  const title = root.querySelector('.soc-mini__title');
  const text  = root.querySelector('.soc-mini__text');
  const file  = root.querySelector('.soc-mini__file');
  const prevWrap = root.querySelector('.soc-mini__preview');
  const grid = prevWrap.querySelector('.soc-grid');

  // Hide global event orb while Social is active
  const globalOrb = document.querySelector('.c-bottom-cta');
  if (globalOrb) { globalOrb.classList.add('is-hidden'); globalOrb.style.display='none'; }

  // Make Social FAB appear/disappear like event orb (by sentinel)
  const fabWrap = root.querySelector('.soc-fabwrap');
  const sentinel = document.getElementById('orb-sentinel');
  if (fabWrap && sentinel && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry])=>{
      if (entry.isIntersecting) fabWrap.classList.add('is-visible');
      else fabWrap.classList.remove('is-visible');
    }, { threshold: 0.01 });
    io.observe(sentinel);
  } else {
    fabWrap?.classList.add('is-visible');
  }

  let images = [];
  const openMini = () => { mini.hidden=false; mini.setAttribute('aria-hidden','false'); requestAnimationFrame(()=>mini.classList.add('is-open')); text.focus({preventScroll:true}); };
  const closeMini = () => { mini.classList.remove('is-open'); setTimeout(()=>{ mini.hidden=true; mini.setAttribute('aria-hidden','true'); },120); title.value=''; text.value=''; images=[]; grid.innerHTML=''; prevWrap.hidden=true; file.value=''; };

  fab.addEventListener('click', (e)=>{ e.stopPropagation(); if (mini.hidden) openMini(); else closeMini(); });
  closeBtn.addEventListener('click', (e)=>{ e.stopPropagation(); closeMini(); });
  document.addEventListener('click', (e)=>{ if (!mini.hidden && !mini.contains(e.target) && e.target !== fab) closeMini(); });
  document.addEventListener('keydown', (e)=>{ if (e.key==='Escape' && !mini.hidden) closeMini(); });

  file.onchange = async (e)=>{
    const files = [...(e.target.files||[])].slice(0, LIMITS.IMAGES_MAX);
    images=[]; grid.innerHTML='';
    for (const f of files){
      try{ const data = await compressImage(f); images.push(data); const ph=document.createElement('div'); ph.className='soc-prev'; ph.innerHTML=`<img src="${data}" alt="">`; grid.appendChild(ph); }catch{}
    }
    prevWrap.hidden = images.length === 0;
  };

  publishBtn.addEventListener('click', ()=>{
    const t = title.value.trim().slice(0,100);
    let body = text.value.trim();
    if (body.length > LIMITS.TEXT_MAX) body = body.slice(0, LIMITS.TEXT_MAX);
    if (!t && !body && images.length===0) return;
    const post = { id:crypto.randomUUID(), author:meName(), avatar:meAvatar(), title:t, text:body, images:images.slice(0, LIMITS.IMAGES_MAX), createdAt:nowISO(), cheers:0, comments:[] };
    const all = readPosts(); all.push(post); writePosts(all);
    document.dispatchEvent(new CustomEvent('social-activity-changed'));
    renderList(root, root.querySelector('.soc-tab.is-on')?.dataset.tab || 'feed');
    closeMini();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// actions
function wireActions(root){
  root.addEventListener('click', async (e)=>{
    const card = e.target.closest('.soc-card');
    const act  = e.target.closest('[data-act]');
    if (!card || !act) return;
    const id = card.getAttribute('data-id');
    const action = act.getAttribute('data-act');

    if (action==='cheer'){
      const posts=readPosts(); const p=posts.find(x=>String(x.id)===String(id)); if(!p) return;
      const map=readCheers(); if(map[id]){ map[id]=false; p.cheers=Math.max(0,(p.cheers||0)-1); } else { map[id]=true; p.cheers=(p.cheers||0)+1; }
      writeCheers(map); writePosts(posts);
      act.querySelector('.n').textContent=String(p.cheers||0);
      document.dispatchEvent(new CustomEvent('social-activity-changed'));
      return;
    }
    if (action==='share'){
      try{ const url=location.href.replace(/#.*$/,'#/social'); const text=`#LooZ — ${meName()} שיתף/פה הישג 🏅`; if(navigator.share) await navigator.share({title:'LooZ',text,url}); else { await navigator.clipboard.writeText(url); act.classList.add('is-done'); setTimeout(()=>act.classList.remove('is-done'),900); } }catch{}
      return;
    }
    if (action==='comment'){
      const posts=readPosts(); const p=posts.find(x=>String(x.id)===String(id)); if(!p) return;
      renderCommentsInto(card,p);
      const box=card.querySelector('.soc-comm'); const hidden=box.hasAttribute('hidden');
      card.classList.toggle('is-expanded', hidden);
      if(hidden){ box.hidden=false; box.setAttribute('aria-hidden','false'); box.querySelector('.soc-comm__ta').focus({preventScroll:true}); }
      else{ box.hidden=true; box.setAttribute('aria-hidden','true'); card.classList.remove('is-expanded'); }
      return;
    }
    if (action==='send-comment'){
      const ta=card.querySelector('.soc-comm__ta'); const txt=(ta.value||'').trim().slice(0,250); if(!txt) return;
      const posts=readPosts(); const p=posts.find(x=>String(x.id)===String(id)); if(!p) return;
      p.comments=p.comments||[]; p.comments.push({id:crypto.randomUUID(), text:txt, createdAt:nowISO()}); writePosts(posts);
      card.querySelector('[data-act="comment"] .n').textContent=String(p.comments.length);
      ta.value=''; renderCommentsInto(card,p); document.dispatchEvent(new CustomEvent('social-activity-changed')); return;
    }
  });
}

// tabs + mount
function wireTabs(root){
  $$('.soc-tab', root).forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.soc-tab', root).forEach(b=>{ b.classList.toggle('is-on', b===btn); b.setAttribute('aria-selected', String(b===btn)); });
      renderList(root, btn.dataset.tab); window.scrollTo(0,0);
    });
  });
}

export function mount(appOrRoot){
  const viewRoot =
    (appOrRoot && appOrRoot.querySelector?.('#viewRoot')) ||
    document.getElementById('viewRoot') ||
    appOrRoot || document.body;

  document.body.setAttribute('data-view','social');
  viewRoot.innerHTML = viewShell();
  renderList(viewRoot,'feed');
  wireTabs(viewRoot);
  wireFabAndMini(viewRoot);
  wireActions(viewRoot);
  try{ window.scrollTo(0,0); }catch{}
}

export default { mount };
