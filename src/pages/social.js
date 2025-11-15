// /src/pages/social.js
// Social feed hooked to Firestore social.service.js
// + logs likes/comments to localStorage (for profile history)
// + supports focusing a post from the profile.
// + supports viewing another user's feed when search sets social.viewUid/social.viewName.

import '../styles/views/_social.scss';
import {
  subscribeSocialPosts,
  createSocialPost,
  toggleCheerOnPost,
  addCommentToPost,
  uploadPostImage,
} from '../services/social.service.js';

import { db, auth } from '../core/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

const LIMITS = {
  TEXT_MAX: 500,
  IMAGES_MAX: 3,
};

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (m) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]
  ));

const pad2 = (n) => String(n).padStart(2, '0');

// we keep latest posts here so profile page can read them
let _latestPosts = [];

// and we keep the current user's app profile here (authoring profile)
let _profile = {
  name: 'אורח',
  avatar: '',
};

/* -----------------------------------------------
   View context – whose feed are we looking at?
   "all"  => community feed (your original behaviour)
   "user" => only posts of a specific user (from search)
----------------------------------------------- */
let _viewMode = 'all';
let _viewTargetUid = null;
let _viewTargetName = '';
let _viewTargetAvatar = '';

const VIEW_USER_KEY_UID    = 'social.viewUid';
const VIEW_USER_KEY_NAME   = 'social.viewName';
const VIEW_USER_KEY_AVATAR = 'social.viewAvatar';

function initViewContext() {
  const viewerUid = auth.currentUser?.uid || null;
  const lsUid     = localStorage.getItem(VIEW_USER_KEY_UID);
  const lsName    = localStorage.getItem(VIEW_USER_KEY_NAME) || '';
  const lsAvatar  = localStorage.getItem(VIEW_USER_KEY_AVATAR) || '';

  if (lsUid && (!viewerUid || lsUid !== viewerUid)) {
    _viewMode        = 'user';
    _viewTargetUid   = lsUid;
    _viewTargetName  = lsName;
    _viewTargetAvatar = lsAvatar;
  } else {
    _viewMode        = 'all';
    _viewTargetUid   = null;
    _viewTargetName  = '';
    _viewTargetAvatar = '';
  }

  // clear one-shot navigation info so it doesn't leak to future visits
  localStorage.removeItem(VIEW_USER_KEY_UID);
  localStorage.removeItem(VIEW_USER_KEY_NAME);
  localStorage.removeItem(VIEW_USER_KEY_AVATAR);
}

/* -----------------------------------------------
   Activity storage – so profile can show history
----------------------------------------------- */
const SOCIAL_ACTIVITY_KEY = 'social.activity';

function loadSocialActivity() {
  return JSON.parse(localStorage.getItem(SOCIAL_ACTIVITY_KEY) || '{"likes":[],"comments":[]}');
}
function saveSocialActivity(obj) {
  localStorage.setItem(SOCIAL_ACTIVITY_KEY, JSON.stringify(obj));
}

/* -------------------------------------------------------------
   1. get profile from localStorage (your original keys)
------------------------------------------------------------- */
function readProfileFromLS() {
  const first =
    localStorage.getItem('firstName') ||
    localStorage.getItem('profile.firstName') ||
    localStorage.getItem('profile_name') ||
    '';
  const last =
    localStorage.getItem('lastName') ||
    localStorage.getItem('profile.lastName') ||
    localStorage.getItem('profile_lastName') ||
    '';
  let name = 'אורח';
  if (first || last) name = `${first} ${last}`.trim();

  const avatar =
    localStorage.getItem('profile.avatar') || // your original
    localStorage.getItem('profile.avatarUrl') ||
    localStorage.getItem('avatarUrl') ||
    localStorage.getItem('avatar') ||
    localStorage.getItem('user.avatarUrl') ||
    '';

  return { name, avatar };
}

/* -------------------------------------------------------------
   2. try to fetch users/{uid} from Firestore to get avatarUrl
   (this is YOUR profile, not the viewed user)
------------------------------------------------------------- */
async function readProfileFromFirestore() {
  const u = auth.currentUser;
  if (!u) return null;
  try {
    const snap = await getDoc(doc(db, 'users', u.uid));
    if (!snap.exists()) return null;
    const data = snap.data() || {};
    const first = data.firstName || data.fname || '';
    const last = data.lastName || data.lname || '';
    const name =
      (first || last) ? `${first} ${last}`.trim() : data.name || u.displayName || u.email || 'אורח';
    const avatar =
      data.avatarUrl ||
      data.photoUrl ||
      data.photoURL ||
      '';
    return { name, avatar };
  } catch (err) {
    console.warn('[social] failed to fetch profile doc', err);
    return null;
  }
}

/* ------------------------------------------------------------- */
function fmtFullDate(d) {
  return new Intl.DateTimeFormat('he-IL', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/* ------------------------------------------------------------- */
const ico = {
  cheer: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 2h10l-2 5h-6L7 2Zm-3 3h3.2l-.8 2H5a3 3 0 0 0 3 3h.2a6.5 6.5 0 0 0 7.6 3.6A6.5 6.5 0 0 0 18 10h.1A3 3 0 0 0 21 7h-1.4a2 2 0 0 1-2 2h-1l-.8-2H20a4 4 0 0 0-4-4H8A4 4 0 0 0 4 5Z"/></svg>`,
  comment: `<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 4h18v12H7l-4 4V4Z"/></svg>`,
  share: `<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.2" fill="currentColor"/><circle cx="17" cy="6" r="2.2" fill="currentColor"/><circle cx="18" cy="18" r="2.2" fill="currentColor"/><path d="M7.8 11.2C10 9.4 13.6 7.6 15.2 6.9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M8.1 12.8c2.3 1.4 6.1 3.5 8 4.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  pencilBadge: `
    <svg viewBox="0 0 120 120" class="soc-pencil">
      <defs>
        <linearGradient id="p1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffdf7d"/>
          <stop offset="100%" stop-color="#ff9640"/>
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="#f77147"/>
      <circle cx="60" cy="60" r="50" fill="#fff" opacity="0.12"/>
      <rect x="50" y="25" width="20" height="55" rx="10" fill="url(#p1)"/>
      <rect x="46" y="18" width="28" height="13" rx="6.5" fill="#ff6f9f"/>
      <rect x="46" y="40" width="28" height="8" fill="#ddd"/>
      <rect x="46" y="48" width="28" height="5" fill="#ccc"/>
      <path d="M50 80 60 103 70 80Z" fill="#f9f0d0" stroke="#222" stroke-width="2"/>
      <path d="M60 103 65 92 55 92Z" fill="#222"/>
    </svg>
  `,
};

/* ------------------------------------------------------------- */
function viewShell() {
  return `
    <section class="p-social" dir="rtl">
      <header class="soc-head">
        <h1 class="soc-title">חבר׳ה ✨</h1>
        <div class="soc-headline">
          <span class="soc-headline__who" data-role="soc-view-label"></span>
        </div>
        <div class="soc-tabs" role="tablist">
          <button class="soc-tab is-on" data-tab="feed" role="tab" aria-selected="true">פיד</button>
          <button class="soc-tab" data-tab="mine" role="tab" aria-selected="false">הפרסומים שלי</button>
        </div>
      </header>
      <div class="soc-list" role="list"></div>
    </section>

    <div class="soc-fabwrap is-visible">
      <button class="soc-fab soc-fab--pencil" aria-label="פרסום חדש">
        ${ico.pencilBadge}
      </button>

      <div class="soc-mini" hidden aria-hidden="true">
        <button class="soc-mini__x" data-mini="close" aria-label="סגור">×</button>

        <div class="soc-mini__me">
          <img class="soc-mini__ava" src="" alt="">
          <div class="soc-mini__name"></div>
        </div>

        <label class="soc-mini__label">כותרת (אופציונלי)</label>
        <input class="soc-mini__title" type="text" maxlength="100" placeholder="אפשר להוסיף כותרת…">

        <textarea class="soc-mini__text" rows="3" maxlength="${LIMITS.TEXT_MAX}" placeholder="מה השגתם היום? (עד ${LIMITS.TEXT_MAX} תווים)"></textarea>

        <div class="soc-mini__bar">
          <label class="soc-mini__icon" title="תמונות (עד ${LIMITS.IMAGES_MAX})">
            <input class="soc-mini__file" type="file" accept="image/*" multiple hidden>
            📷
          </label>
          <div class="soc-mini__spacer"></div>
          <button class="soc-mini__publish" data-mini="publish" aria-label="פרסום">פרסום</button>
        </div>

        <div class="soc-mini__preview" hidden>
          <div class="soc-grid"></div>
        </div>
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------- */
function imagesHTML(arr = []) {
  return arr.map((src) => `<figure class="soc-media soc-media--wide"><img src="${src}" alt=""></figure>`).join('');
}
function commentsBlockHTML(p) {
  const list = (p.comments || [])
    .map((c) => {
      const ts = c.createdAt?.seconds ? c.createdAt.seconds * 1000 : c.createdAt || Date.now();
      return `
        <li class="soc-c__item">
          <div class="soc-c__head">
            <img class="soc-c__ava" src="${c.avatar || ''}" alt="">
            <b class="soc-c__name">${esc(c.author || '')}</b>
            <time class="soc-c__when">${fmtFullDate(new Date(ts))}</time>
          </div>
          <p class="soc-c__text">${esc(c.text)}</p>
        </li>`;
    })
    .join('');
  return `
    <div class="soc-comm" hidden aria-hidden="true">
      <ul class="soc-c__list">${list}</ul>
      <div class="soc-c__write">
        <textarea class="soc-comm__ta" rows="2" maxlength="250" placeholder="כתבו תגובה קצרה…"></textarea>
        <button class="soc-comm__send" data-act="send-comment" aria-label="שלח תגובה">שלח</button>
      </div>
    </div>`;
}
function cardHTML(p, profileAvatar = '') {
  const ts = p.createdAt?.seconds ? p.createdAt.seconds * 1000 : p.createdAt || Date.now();
  const when = fmtFullDate(new Date(ts));
  const displayAvatar = p.avatar || profileAvatar || '';
  const ownerUidAttr = p.authorUid ? ` data-owner-uid="${esc(p.authorUid)}"` : '';
  return `
    <article class="soc-card" role="listitem" data-id="${p.id}"${ownerUidAttr}>
      <header class="soc-card__head">
        <div class="soc-author">
          <img class="soc-ava" src="${displayAvatar}" alt="">
          <div class="soc-who">
            <div class="soc-name">${esc(p.author || '')}</div>
            <div class="soc-when">${when}</div>
          </div>
        </div>
      </header>
      ${p.title ? `<h3 class="soc-titleline">${esc(p.title)}</h3>` : ''}
      ${p.images?.length ? imagesHTML(p.images) : ''}
      ${p.text ? `<p class="soc-body">${esc(p.text)}</p>` : ''}
      <footer class="soc-foot">
        <button class="soc-act" data-act="cheer" aria-label="כל הכבוד"><i>${ico.cheer}</i><b class="n">${p.cheers || 0}</b></button>
        <button class="soc-act" data-act="comment" aria-label="תגובות"><i>${ico.comment}</i><b class="n">${(p.comments || []).length}</b></button>
        <button class="soc-act" data-act="share" aria-label="שיתוף"><i>${ico.share}</i></button>
      </footer>
      ${commentsBlockHTML(p)}
    </article>`;
}

/* ------------------------------------------------------------- */
function normalizeMine(list, profile) {
  const uid = auth.currentUser?.uid || null;
  const myName = profile.name;
  const myAvatar = profile.avatar;
  return list.map((p) => {
    const isMine =
      (uid && p.authorUid === uid) ||
      (!p.authorUid && p.author === myName);
    return isMine ? { ...p, author: myName, avatar: myAvatar } : p;
  });
}

function renderList(
  root,
  posts,
  tab = 'feed',
  profile = _profile,
  viewMode = _viewMode,
  targetUid = _viewTargetUid
) {
  const host = root.querySelector('.soc-list');
  if (!host) return;

  let list = normalizeMine(posts, profile).slice().sort((a, b) => {
    const ta = a.createdAt?.seconds ? a.createdAt.seconds : a.createdAt || 0;
    const tb = b.createdAt?.seconds ? b.createdAt.seconds : b.createdAt || 0;
    return tb - ta;
  });

  // If we're in "view this user's feed" mode, filter by authorUid
  if (viewMode === 'user' && targetUid) {
    list = list.filter((p) => p.authorUid === targetUid);
  }

  // "mine" tab still means "my posts"
  if (tab === 'mine') {
    const viewerUid = auth.currentUser?.uid || null;
    if (viewerUid) {
      list = list.filter((p) => p.authorUid === viewerUid || p.author === profile.name);
    } else {
      list = list.filter((p) => p.author === profile.name);
    }
  }

  host.innerHTML = list.length
    ? list.map((p) => cardHTML(p, profile.avatar)).join('')
    : `<div class="soc-empty">עוד אין פרסומים. הקליקו על העיפרון כדי לפרסם!</div>`;
}

/* ------------------------------------------------------------- */
function hydrateMini(root, profile) {
  const ava = root.querySelector('.soc-mini__ava');
  const nm = root.querySelector('.soc-mini__name');
  if (ava) ava.src = profile.avatar || '';
  if (nm) nm.textContent = profile.name || 'אורח';
}

/* ------------------------------------------------------------- */
function wireFabAndMini(root, disabled = false) {
  const fabWrap   = root.querySelector('.soc-fabwrap');
  const fab       = root.querySelector('.soc-fab');
  const mini      = root.querySelector('.soc-mini');
  const closeBtn  = root.querySelector('[data-mini="close"]');
  const publishBtn = root.querySelector('[data-mini="publish"]');
  const title     = root.querySelector('.soc-mini__title');
  const text      = root.querySelector('.soc-mini__text');
  const file      = root.querySelector('.soc-mini__file');
  const prevWrap  = root.querySelector('.soc-mini__preview');
  const grid      = prevWrap ? prevWrap.querySelector('.soc-grid') : null;

  if (disabled) {
    if (fabWrap) fabWrap.style.display = 'none';
    return;
  }

  if (!fab || !mini || !closeBtn || !publishBtn || !title || !text || !file || !prevWrap || !grid) {
    return;
  }

  let images = [];

  const openMini = () => {
    mini.hidden = false;
    mini.setAttribute('aria-hidden', 'false');
    mini.classList.add('is-open');
    text.focus({ preventScroll: true });
  };
  const closeMini = () => {
    mini.classList.remove('is-open');
    mini.hidden = true;
    mini.setAttribute('aria-hidden', 'true');
    title.value = '';
    text.value = '';
    images = [];
    prevWrap.hidden = true;
    grid.innerHTML = '';
  };

  fab.addEventListener('click', (e) => {
    e.stopPropagation();
    if (mini.hidden) openMini();
    else closeMini();
  });
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeMini();
  });
  document.addEventListener('click', (e) => {
    if (!mini.hidden && !mini.contains(e.target) && e.target !== fab) closeMini();
  });

  file.onchange = async (e) => {
    const files = [...(e.target.files || [])].slice(0, LIMITS.IMAGES_MAX);
    images = [];
    grid.innerHTML = '';
    for (const f of files) {
      try {
        const url = await uploadPostImage(f);
        images.push(url);
        const ph = document.createElement('div');
        ph.className = 'soc-prev';
        ph.innerHTML = `<img src="${url}" alt="">`;
        grid.appendChild(ph);
      } catch (err) {
        console.warn('upload image failed', err);
      }
    }
    prevWrap.hidden = images.length === 0;
  };

  publishBtn.addEventListener('click', async () => {
    const t = title.value.trim();
    let body = text.value.trim();
    if (!t && !body && images.length === 0) return;
    if (body.length > LIMITS.TEXT_MAX) body = body.slice(0, LIMITS.TEXT_MAX);

    await createSocialPost({
      title: t,
      text: body,
      images,
      author: _profile.name,
      avatar: _profile.avatar,
      authorUid: auth.currentUser?.uid || null,   // pass owner uid
    });

    closeMini();
  });
}

/* ------------------------------------------------------------- */
function wireActions(root) {
  root.addEventListener('click', async (e) => {
    const card = e.target.closest('.soc-card');
    const act = e.target.closest('[data-act]');
    if (!card || !act) return;
    const id = card.getAttribute('data-id');
    const ownerUid = card.getAttribute('data-owner-uid') || '';
    const action = act.getAttribute('data-act');

    const cardTitle =
      card.querySelector('.soc-titleline')?.textContent ||
      card.querySelector('.soc-body')?.textContent ||
      'ללא כותרת';

    if (action === 'cheer') {
      await toggleCheerOnPost(id);

      // ---- local activity (for Profile LTR pill) ----
      const state = loadSocialActivity();
      const now = new Date();
      const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
      const dateKey = `${pad2(now.getDate())}.${pad2(now.getMonth() + 1)}.${now.getFullYear()}`;
      const last = state.likes[0];
      if (!last || last.postId !== id || last.time !== time) {
        state.likes.unshift({ postId: id, title: cardTitle, time, dateKey });
        state.likes = state.likes.slice(0, 40);
        saveSocialActivity(state);
      }

      return;
    }

    if (action === 'comment') {
      const box = card.querySelector('.soc-comm');
      const hidden = box.hasAttribute('hidden');
      if (hidden) {
        box.hidden = false;
        box.setAttribute('aria-hidden', 'false');
        box.querySelector('.soc-comm__ta').focus({ preventScroll: true });
      } else {
        box.hidden = true;
        box.setAttribute('aria-hidden', 'true');
      }
      return;
    }

    if (action === 'share') {
      try {
        // simple share: copy base social URL (you can upgrade this later)
        const url = location.href.replace(/#.*$/, '#/social');
        await navigator.clipboard.writeText(url);
        act.classList.add('is-done');
        setTimeout(() => act.classList.remove('is-done'), 800);
      } catch {}
      return;
    }

    if (action === 'send-comment') {
      const ta = card.querySelector('.soc-comm__ta');
      const txt = (ta.value || '').trim().slice(0, 250);
      if (!txt) return;
      await addCommentToPost(id, {
        text: txt,
        author: _profile.name,
        avatar: _profile.avatar,
      });
      ta.value = '';

      // ---- local activity
      const state = loadSocialActivity();
      const now = new Date();
      const time = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
      const dateKey = `${pad2(now.getDate())}.${pad2(now.getMonth() + 1)}.${now.getFullYear()}`;
      state.comments.unshift({ postId: id, title: cardTitle, text: txt, time, dateKey });
      state.comments = state.comments.slice(0, 40);
      saveSocialActivity(state);

      return;
    }
  });
}

/* ------------------------------------------------------------- */
function wireTabs(root, postsRef) {
  $$('.soc-tab', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.soc-tab', root).forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-selected', String(on));
      });
      renderList(root, postsRef.current, btn.dataset.tab, _profile, _viewMode, _viewTargetUid);
    });
  });
}

/* ------------------------------------------------------------- */
export function mount(appOrRoot) {
  const viewRoot =
    (appOrRoot && appOrRoot.querySelector?.('#viewRoot')) ||
    document.getElementById('viewRoot') ||
    appOrRoot ||
    document.body;

  document.body.setAttribute('data-view', 'social');
  viewRoot.innerHTML = viewShell();

  // decide whose feed we're viewing (community vs specific user from search)
  initViewContext();

  // set headline label
  const labelEl = viewRoot.querySelector('[data-role="soc-view-label"]');
  if (labelEl) {
    if (_viewMode === 'user' && (_viewTargetName || _viewTargetUid)) {
      labelEl.textContent = _viewTargetName
        ? `הפיד של ${_viewTargetName}`
        : 'פיד משתמש';
    } else {
      labelEl.textContent = 'פיד קהילתי';
    }
  }

  // initial profile from LS / auth (this is YOUR profile, for posting / activity logs)
  const lsProf = readProfileFromLS();
  _profile = lsProf.avatar || lsProf.name !== 'אורח'
    ? lsProf
    : (auth.currentUser
        ? { name: auth.currentUser.displayName || auth.currentUser.email || 'אורח', avatar: auth.currentUser.photoURL || '' }
        : lsProf);
  hydrateMini(viewRoot, _profile);

  // then try to override with Firestore profile (where your uploaded pic lives)
  (async () => {
    const fsProf = await readProfileFromFirestore();
    if (fsProf && (fsProf.avatar || fsProf.name)) {
      _profile = {
        name: fsProf.name || _profile.name,
        avatar: fsProf.avatar || _profile.avatar,
      };
      hydrateMini(viewRoot, _profile);
      renderList(
        viewRoot,
        _latestPosts,
        viewRoot.querySelector('.soc-tab.is-on')?.dataset.tab || 'feed',
        _profile,
        _viewMode,
        _viewTargetUid
      );
    }
  })();

  const postsRef = { current: [] };

  subscribeSocialPosts((list) => {
    _latestPosts = Array.isArray(list) ? list : [];
    postsRef.current = _latestPosts;

    // keep old behaviour for profile page that read localStorage
    try {
      localStorage.setItem('social.posts', JSON.stringify(_latestPosts));
    } catch {}

    const tab = viewRoot.querySelector('.soc-tab.is-on')?.dataset.tab || 'feed';
    renderList(viewRoot, postsRef.current, tab, _profile, _viewMode, _viewTargetUid);

    // if profile asked to focus a specific post
    const focusId = localStorage.getItem('social.focusPostId');
    if (focusId) {
      const card = viewRoot.querySelector(`.soc-card[data-id="${focusId}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        card.classList.add('is-highlighted');
        setTimeout(() => card.classList.remove('is-highlighted'), 1400);
      }
      localStorage.removeItem('social.focusPostId');
    }
  });

  wireTabs(viewRoot, postsRef);

  const viewerUid = auth.currentUser?.uid || null;
  const disableComposer =
    _viewMode === 'user' && _viewTargetUid && _viewTargetUid !== viewerUid;

  wireFabAndMini(viewRoot, disableComposer);
  wireActions(viewRoot);
}

/* exported for the profile page */
export function getSocialActivity() {
  const activity = loadSocialActivity();
  // keep posts too, for compatibility
  return {
    likes: activity.likes || [],
    comments: activity.comments || [],
    posts: _latestPosts,
  };
}

export default { mount, getSocialActivity };
