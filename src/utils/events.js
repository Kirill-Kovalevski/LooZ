// /src/utils/events.js
// One source of truth for Active events + two archives (Done/Removed).
// Views listen to EVENTS_CHANGED (and optional STATS_CHANGED) for re-rendering.

export const STORE_ACTIVE   = 'events';       // unchanged: keeps your current data
export const STORE_DONE     = 'events.done';
export const STORE_REMOVED  = 'events.rem';
export const EVENTS_CHANGED = 'events-changed';
export const STATS_CHANGED  = 'stats-changed';

// ---------- helpers ----------
const pad2 = n => String(n).padStart(2, '0');
export const keyOf = d => {
  const dt = (d instanceof Date) ? d : new Date(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())}`;
};
export const hhmm = d => {
  const dt = (d instanceof Date) ? d : new Date(d);
  return `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
};

const readJSON  = (k, def = []) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(def)); } catch { return def; } };
const writeJSON = (k, v) => { localStorage.setItem(k, JSON.stringify(v)); };
const emit      = (type) => document.dispatchEvent(new Event(type));

const makeId = () => (crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2,8)}`);

// ---------- ACTIVE ----------
export function getAllEvents() {
  return readJSON(STORE_ACTIVE).slice().sort((a,b) =>
    (`${a.date||''}${a.time||''}`).localeCompare(`${b.date||''}${b.time||''}`)
  );
}
export function getEventsByDate(dateKey) {
  return getAllEvents().filter(e => e.date === dateKey);
}
export function addEvent({ id, date, time='00:00', title='', done=false }) {
  const list = readJSON(STORE_ACTIVE);
  const dk   = typeof date === 'string' ? date : keyOf(date);
  const item = { id: id || makeId(), date: dk, time, title: String(title), done: !!done };
  list.push(item);
  writeJSON(STORE_ACTIVE, list);
  emit(EVENTS_CHANGED);
  return item.id;
}
export function updateEvent(id, patch) {
  const list = readJSON(STORE_ACTIVE);
  const ix   = list.findIndex(e => e.id === id);
  if (ix === -1) return false;
  list[ix] = { ...list[ix], ...patch };
  writeJSON(STORE_ACTIVE, list);
  emit(EVENTS_CHANGED);
  return true;
}
export function toggleDone(id) {
  const list = readJSON(STORE_ACTIVE);
  const ix   = list.findIndex(e => e.id === id);
  if (ix === -1) return false;
  list[ix].done = !list[ix].done;
  writeJSON(STORE_ACTIVE, list);
  emit(EVENTS_CHANGED);
  return true;
}
export function removeEvent(id) {
  const next = readJSON(STORE_ACTIVE).filter(e => e.id !== id);
  writeJSON(STORE_ACTIVE, next);
  emit(EVENTS_CHANGED);
  return true;
}

// ---------- ARCHIVES (Done / Removed) ----------
export const _getAllActive  = () => getAllEvents();
export const _getAllDone    = () => readJSON(STORE_DONE);
export const _getAllRemoved = () => readJSON(STORE_REMOVED);

// Move active → done (and stamp time)
export function completeEvent(id) {
  const list = readJSON(STORE_ACTIVE);
  const ix   = list.findIndex(e => e.id === id);
  if (ix === -1) return false;
  const [item] = list.splice(ix, 1);
  writeJSON(STORE_ACTIVE, list);

  const done = readJSON(STORE_DONE);
  done.push({ ...item, completedAt: new Date().toISOString() });
  writeJSON(STORE_DONE, done);

  emit(EVENTS_CHANGED);
  emit(STATS_CHANGED);
  return true;
}

// Move active → removed (and stamp time)
export function trashEvent(id) {
  const list = readJSON(STORE_ACTIVE);
  const ix   = list.findIndex(e => e.id === id);
  if (ix === -1) return false;
  const [item] = list.splice(ix, 1);
  writeJSON(STORE_ACTIVE, list);

  const rem = readJSON(STORE_REMOVED);
  rem.push({ ...item, removedAt: new Date().toISOString() });
  writeJSON(STORE_REMOVED, rem);

  emit(EVENTS_CHANGED);
  emit(STATS_CHANGED);
  return true;
}

// Permanently remove from an archive
export function permaDelete(id, which /* 'done' | 'removed' */) {
  const K = which === 'done' ? STORE_DONE : STORE_REMOVED;
  const next = readJSON(K).filter(t => String(t.id) !== String(id));
  writeJSON(K, next);
  emit(EVENTS_CHANGED);
  emit(STATS_CHANGED);
  return true;
}

// Date filter on archive (inclusive)
export function queryArchive(which, { from, to } = {}) {
  const K     = which === 'done' ? STORE_DONE : STORE_REMOVED;
  const list  = readJSON(K);
  if (!from && !to) return list.slice();

  const fromT = from ? new Date(from + 'T00:00:00').getTime() : -Infinity;
  const toT   = to   ? new Date(to   + 'T23:59:59').getTime() :  Infinity;

  return list.filter(t => {
    const ts = new Date(t.completedAt || t.removedAt || t.date).getTime();
    return ts >= fromT && ts <= toT;
  });
}

export default {
  STORE_ACTIVE, STORE_DONE, STORE_REMOVED,
  EVENTS_CHANGED, STATS_CHANGED,
  keyOf, hhmm,
  getAllEvents, getEventsByDate, addEvent, updateEvent, toggleDone, removeEvent,
  _getAllActive, _getAllDone, _getAllRemoved,
  completeEvent, trashEvent, permaDelete, queryArchive,
};
