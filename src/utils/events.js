// /src/utils/events.js
// One source of truth for Active events + two archives (Done/Removed).
// Views listen to EVENTS_CHANGED (and optional STATS_CHANGED) for re-rendering.

import { auth, authReady } from '../core/firebase.js';
import {
  subscribeUserEvents,
  addUserEvent,
  updateUserEvent,
  deleteUserEvent,
} from '../services/events.service.js';

export const STORE_ACTIVE   = 'events';       // unchanged: keeps your current data
export const STORE_DONE     = 'events.done';
export const STORE_REMOVED  = 'events.rem';
export const EVENTS_CHANGED = 'events-changed';
export const STATS_CHANGED  = 'stats-changed';

// ---------- helpers ----------
const pad2 = n => String(n).padStart(2, '0');
export const keyOf = d => {
  const dt = (d instanceof Date) ? d : new Date(d);
  return `${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getMonth()+1) === 'NaN' ? '01' : pad2(dt.getDate())}`;
};
export const hhmm = d => {
  const dt = (d instanceof Date) ? d : new Date(d);
  return `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
};

const readJSON  = (k, def = []) => { try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(def)); } catch { return def; } };
const writeJSON = (k, v) => { localStorage.setItem(k, JSON.stringify(v)); };
const emit      = (type) => document.dispatchEvent(new Event(type));

const makeId = () => (crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2,8)}`);

// in-memory mirrors (populated from LS first, then from Firestore)
let _active  = readJSON(STORE_ACTIVE);
let _done    = readJSON(STORE_DONE);
let _removed = readJSON(STORE_REMOVED);
let _unsubscribe = null;

// save all 3 lists back to LS
function persistAll() {
  writeJSON(STORE_ACTIVE,  _active);
  writeJSON(STORE_DONE,    _done);
  writeJSON(STORE_REMOVED, _removed);
}

// when we get items from Firestore, normalize them to our 3 buckets
function applyRemoteEvents(items) {
  const nextActive  = [];
  const nextDone    = [];
  const nextRemoved = [];

  for (const raw of items) {
    // normalize description:
    //  - prefer raw.desc
    //  - fallback to raw.description (old schema)
    const it = {
      ...raw,
      desc: typeof raw.desc === 'string'
        ? raw.desc
        : (typeof raw.description === 'string' ? raw.description : '')
    };

    if (it.removed) nextRemoved.push(it);
    else if (it.done) nextDone.push(it);
    else nextActive.push(it);
  }

  // sort similar to your original
  const sorter = (a,b) =>
    (`${a.date||''}${a.time||''}`).localeCompare(`${b.date||''}${b.time||''}`);

  nextActive.sort(sorter);
  nextDone.sort(sorter);
  nextRemoved.sort(sorter);

  _active  = nextActive;
  _done    = nextDone;
  _removed = nextRemoved;
  persistAll();
  emit(EVENTS_CHANGED);
  emit(STATS_CHANGED);
}

// subscribe to Firestore for the current user
export async function resubscribeEventsForUid() {
  await authReady;
  const user = auth.currentUser;

  // stop previous
  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }

  if (!user) {
    // no user → just stay with localStorage
    _active  = readJSON(STORE_ACTIVE);
    _done    = readJSON(STORE_DONE);
    _removed = readJSON(STORE_REMOVED);
    emit(EVENTS_CHANGED);
    return;
  }

  _unsubscribe = subscribeUserEvents(user.uid, (items) => {
    applyRemoteEvents(items);
  });
}

// kick it off once on load (so anonymous users still see LS)
(async () => {
  // we already loaded LS above; now see if we can attach to Firestore
  await resubscribeEventsForUid();
})();

/* ===========================================================
   PUBLIC API
   =========================================================== */

// ---------- ACTIVE ----------
export function getAllEvents() {
  return _active.slice().sort((a,b) =>
    (`${a.date||''}${a.time||''}`).localeCompare(`${b.date||''}${b.time||''}`)
  );
}
export function getEventsByDate(dateKey) {
  return getAllEvents().filter(e => e.date === dateKey);
}

// IMPORTANT: addEvent fully supports `desc` and makes sure it is stored
export async function addEvent({ id, date, time='00:00', title='', desc = '', done=false }) {
  await authReady;
  const user = auth.currentUser;
  const dk   = typeof date === 'string' ? date : keyOf(date);

  const safeTitle = String(title ?? '');
  const safeDesc  = String(desc   ?? '');

  // if logged in → write to Firestore
  if (user) {
    // base event (some implementations of addUserEvent may ignore unknown fields)
    const newId = await addUserEvent(user.uid, {
      id,
      date: dk,
      time,
      title: safeTitle,
      done,
    });

    // guarantee the description field exists in Firestore
    if (safeDesc) {
      await updateUserEvent(user.uid, newId, { desc: safeDesc });
    }

    // snapshot will update us, so no need to mutate _active here
    return newId;
  }

  // guest → keep your old localStorage behavior
  const list = readJSON(STORE_ACTIVE);
  const item = {
    id: id || makeId(),
    date: dk,
    time,
    title: safeTitle,
    desc: safeDesc,
    done: !!done
  };
  list.push(item);
  writeJSON(STORE_ACTIVE, list);
  _active = list;
  emit(EVENTS_CHANGED);
  return item.id;
}

export async function updateEvent(id, patch) {
  await authReady;
  const user = auth.currentUser;

  if (user) {
    await updateUserEvent(user.uid, id, patch);
    return true;
  }

  // local
  const list = readJSON(STORE_ACTIVE);
  const ix   = list.findIndex(e => e.id === id);
  if (ix === -1) return false;
  list[ix] = { ...list[ix], ...patch };
  writeJSON(STORE_ACTIVE, list);
  _active = list;
  emit(EVENTS_CHANGED);
  return true;
}
export async function toggleDone(id) {
  await authReady;
  const user = auth.currentUser;

  if (user) {
    // get item from current mem cache
    const item = _active.find(e => e.id === id);
    if (!item) return false;
    const next = !item.done;
    await updateUserEvent(user.uid, id, {
      done: next,
      completedAt: next ? Date.now() : null,
    });
    return true;
  }

  // local
  const list = readJSON(STORE_ACTIVE);
  const ix   = list.findIndex(e => e.id === id);
  if (ix === -1) return false;
  list[ix].done = !list[ix].done;
  writeJSON(STORE_ACTIVE, list);
  _active = list;
  emit(EVENTS_CHANGED);
  return true;
}
export async function removeEvent(id) {
  await authReady;
  const user = auth.currentUser;

  if (user) {
    // mark as removed
    await updateUserEvent(user.uid, id, {
      removed: true,
      removedAt: Date.now(),
    });
    return true;
  }

  // local
  const next = readJSON(STORE_ACTIVE).filter(e => e.id !== id);
  writeJSON(STORE_ACTIVE, next);
  _active = next;
  emit(EVENTS_CHANGED);
  return true;
}

// ---------- ARCHIVES (Done / Removed) ----------
export const _getAllActive  = () => _active.slice();
export const _getAllDone    = () => _done.slice();
export const _getAllRemoved = () => _removed.slice();

// Move active → done (and stamp time)
export async function completeEvent(id) {
  await authReady;
  const user = auth.currentUser;

  if (user) {
    await updateUserEvent(user.uid, id, {
      done: true,
      completedAt: Date.now(),
    });
    return true;
  }

  // local
  const list = readJSON(STORE_ACTIVE);
  const ix   = list.findIndex(e => e.id === id);
  if (ix === -1) return false;
  const [item] = list.splice(ix, 1);
  writeJSON(STORE_ACTIVE, list);
  const done = readJSON(STORE_DONE);
  done.push({ ...item, completedAt: new Date().toISOString() });
  writeJSON(STORE_DONE, done);
  _active = list;
  _done   = done;
  emit(EVENTS_CHANGED);
  emit(STATS_CHANGED);
  return true;
}

// Move active → removed (and stamp time)
export async function trashEvent(id) {
  await authReady;
  const user = auth.currentUser;

  if (user) {
    await updateUserEvent(user.uid, id, {
      removed: true,
      removedAt: Date.now(),
    });
    return true;
  }

  // local
  const list = readJSON(STORE_ACTIVE);
  const ix   = list.findIndex(e => e.id === id);
  if (ix === -1) return false;
  const [item] = list.splice(ix, 1);
  writeJSON(STORE_ACTIVE, list);
  const rem = readJSON(STORE_REMOVED);
  rem.push({ ...item, removedAt: new Date().toISOString() });
  writeJSON(STORE_REMOVED, rem);
  _active  = list;
  _removed = rem;
  emit(EVENTS_CHANGED);
  emit(STATS_CHANGED);
  return true;
}

// Permanently remove from an archive
export async function permaDelete(id, which /* 'done' | 'removed' */) {
  await authReady;
  const user = auth.currentUser;
  const K = which === 'done' ? STORE_DONE : STORE_REMOVED;

  if (user) {
    // in Firestore we truly delete
    await deleteUserEvent(user.uid, id);
    return true;
  }

  // local
  const next = readJSON(K).filter(t => String(t.id) !== String(id));
  writeJSON(K, next);
  if (which === 'done') _done = next;
  else _removed = next;
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
  resubscribeEventsForUid,
};
