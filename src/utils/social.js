// /src/utils/social.js
// Local social storage (demo). Replace with backend when ready.

const K = {
  POSTS: 'social.posts',
  LIKES: 'social.likes',      // array of { postId, at }
  COMMS: 'social.comments',   // array of { postId, text, at }
};

function now() { return Date.now(); }
function sortDesc(a, b) { return (b.at || 0) - (a.at || 0); }

// --- seed posts (only once) ---
function ensureSeed() {
  const raw = localStorage.getItem(K.POSTS);
  if (raw) return;
  const seed = [
    { id: 'p1', user: 'לוז־מן', title:'סיימתי 5 משימות 👏', text:'יום אש! ניהול זמן ניצח.', img:null, likes:2, comments:1, at: now()-86400000*2 },
    { id: 'p2', user: 'מאיה',    title:'ריצה בים', text:'10K בפארק, מרגיש מעולה', img:null, likes:4, comments:2, at: now()-86400000 },
  ];
  localStorage.setItem(K.POSTS, JSON.stringify(seed));
}
ensureSeed();

// --- core ---
export function getPosts() {
  try { return JSON.parse(localStorage.getItem(K.POSTS) || '[]').sort((a,b)=>b.at-a.at); }
  catch { return []; }
}
export function getPostById(id) {
  return getPosts().find(p => String(p.id) === String(id));
}
function savePosts(arr) {
  localStorage.setItem(K.POSTS, JSON.stringify(arr));
}

export function addPost({ title, text, img }) {
  const list = getPosts();
  const id = 'p' + Math.random().toString(36).slice(2,9);
  list.unshift({ id, user: localStorage.getItem('firstName') || 'אנונימי', title: title||'', text: text||'', img: img||null, likes:0, comments:0, at: now() });
  savePosts(list);
  document.dispatchEvent(new Event('social-updated'));
}

export function toggleAchieve(postId) {
  const likes = getLikesLog();
  const exists = likes.find(x => x.postId === postId);
  const posts = getPosts();
  const p = posts.find(x => x.id === postId);
  if (!p) return;

  if (exists) {
    // unlike
    const next = likes.filter(x => x.postId !== postId);
    localStorage.setItem(K.LIKES, JSON.stringify(next));
    p.likes = Math.max(0, (p.likes||0) - 1);
  } else {
    likes.unshift({ postId, at: now() });
    localStorage.setItem(K.LIKES, JSON.stringify(likes));
    p.likes = (p.likes||0) + 1;
  }
  savePosts(posts);
  document.dispatchEvent(new Event('social-updated'));
}

export function addComment(postId, text) {
  const list = getCommentsLog();
  list.unshift({ postId, text: (text||'').trim(), at: now() });
  localStorage.setItem(K.COMMS, JSON.stringify(list));

  const posts = getPosts();
  const p = posts.find(x => x.id === postId);
  if (p) { p.comments = (p.comments||0) + 1; savePosts(posts); }

  document.dispatchEvent(new Event('social-updated'));
}

export function getLikesLog() {
  try { return JSON.parse(localStorage.getItem(K.LIKES) || '[]').sort(sortDesc); }
  catch { return []; }
}
export function getCommentsLog() {
  try { return JSON.parse(localStorage.getItem(K.COMMS) || '[]').sort(sortDesc); }
  catch { return []; }
}
