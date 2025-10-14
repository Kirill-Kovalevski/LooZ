// src/components/date.js

// === preference (week starts on Sunday or Monday) ==================
export function getWeekStart() {
  return localStorage.getItem('weekStart') || 'sun'; // 'sun' | 'mon'
}
export function setWeekStart(v) {
  localStorage.setItem('weekStart', v);
}

// === day-name arrays ===============================================
const HEB_DAYS_SUN = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];           // Sunday-first
const HEB_DAYS_MON = ['ב׳','ג׳','ד׳','ה׳','ו׳','ש׳','א׳'];           // Monday-first
const ENG_DAYS_SUN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];     // Sunday-first
const ENG_DAYS_MON = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];     // Monday-first

/** Get localized day names with proper week start. */
export function dayNames(locale = 'he') {
  const monStart = getWeekStart() === 'mon';
  if (locale === 'en') return monStart ? ENG_DAYS_MON : ENG_DAYS_SUN;
  return monStart ? HEB_DAYS_MON : HEB_DAYS_SUN;
}

// === formatting helpers ============================================
/** dd.mm (e.g. 12.02) */
export function fmtDM(d) {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}`;
}

/** YYYY-MM-DD */
export function keyOf(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

export const TODAY_KEY = keyOf(new Date());

// === week math ======================================================
/** Return JS getDay() index for the chosen start: 0 = Sunday, 1 = Monday. */
function startIndex() {
  return getWeekStart() === 'mon' ? 1 : 0;
}

/** Get the Date for the start of the week containing `anchor`. */
function startOfWeek(anchor = new Date(), weekStartsOn = startIndex()) {
  const d = new Date(anchor);
  // JS getDay(): 0=Sun..6=Sat
  const day = d.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Build a 7-day array for the week containing `anchor`. */
export function buildWeek(anchor = new Date(), weekStartsOn = startIndex()) {
  const start = startOfWeek(anchor, weekStartsOn);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push(d);
  }
  return out;
}
