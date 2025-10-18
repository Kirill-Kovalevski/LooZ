// /src/utils/events.js
// Single source of truth for events in localStorage.
// Views listen to EVENTS_CHANGED for re-rendering.

export const STORE_KEY       = 'events';          // keep existing data
export const EVENTS_CHANGED  = 'events-changed';  // one canonical event name

// ---------- helpers ----------
const safeRead = () => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
  catch { return []; }
};
const write = (list) => {
  localStorage.setItem(STORE_KEY, JSON.stringify(list));
  document.dispatchEvent(new Event(EVENTS_CHANGED));
};

const pad2 = n => String(n).padStart(2, '0');
export const keyOf = (d) => {
  const dt = (d instanceof Date) ? d : new Date(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())}`;
};

// ✅ bring back hhmm for callers like sheet.js
export function hhmm(d) {
  const dt = (d instanceof Date) ? d : new Date(d);
  return `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}

const makeId = () => (crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2,8)}`);

// ---------- API ----------
export function getAllEvents() {
  return safeRead().slice().sort((a,b) =>
    (`${a.date||''}${a.time||''}`).localeCompare(`${b.date||''}${b.time||''}`)
  );
}

export function getEventsByDate(dateKey) {
  return safeRead()
    .filter(e => e.date === dateKey)
    .sort((a,b) => (a.time || '').localeCompare(b.time || ''));
}

export function addEvent({ id, date, time='00:00', title='', done=false }) {
  const list = safeRead();
  const dk = typeof date === 'string' ? date : keyOf(date);
  const newItem = { id: id || makeId(), date: dk, time, title: String(title), done: !!done };
  list.push(newItem);
  write(list);
  return newItem.id;
}

export function updateEvent(id, patch) {
  const list = safeRead();
  const ix = list.findIndex(e => e.id === id);
  if (ix === -1) return false;
  list[ix] = { ...list[ix], ...patch };
  write(list);
  return true;
}

export function toggleDone(id) {
  const list = safeRead();
  const ix = list.findIndex(e => e.id === id);
  if (ix === -1) return false;
  list[ix].done = !list[ix].done;
  write(list);
  return true;
}

export function removeEvent(id) {
  const next = safeRead().filter(e => e.id !== id);
  write(next);
  return true;
}

// Alias for older code that might call deleteEvent()
export const deleteEvent = removeEvent;

// Optional default aggregate (safe if unused)
export default {
  STORE_KEY,
  EVENTS_CHANGED,
  keyOf,
  hhmm,            // ← included for default import style too
  getAllEvents,
  getEventsByDate,
  addEvent,
  updateEvent,
  toggleDone,
  removeEvent,
  deleteEvent,
};
