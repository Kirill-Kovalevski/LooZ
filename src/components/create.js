// src/components/create.js
// Create-event modal (Hebrew, RTL). Mic centered + buttons below.
// Prefills date from argument OR localStorage.selectedDate. Saves via addEvent.

import { addEvent, keyOf, hhmm } from '../utils/events.js';

let $modal;

export function openCreateModal(dateKey) {
  // chosen date: arg > localStorage > today
  const picked = dateKey || localStorage.getItem('selectedDate') || keyOf(new Date());

  if (!$modal) {
    $modal = document.createElement('div');
    $modal.className = 'create-modal';
    $modal.setAttribute('role', 'dialog');
    $modal.setAttribute('aria-modal', 'true');
    $modal.setAttribute('aria-label', 'אירוע חדש');

    $modal.innerHTML = `
      <div class="create-backdrop" data-close></div>

      <section class="create-card">
        <header class="create-head">
          <button class="icon-x" data-close aria-label="סגור">✕</button>
          <h3 class="create-title">אירוע חדש</h3>
        </header>

        <form id="createForm" class="create-form" novalidate>
          <!-- שם האירוע -->
          <label class="f-field">
            <span class="f-label">שם האירוע</span>
            <input id="evtTitle" name="title" class="f-input f-input--big"
                   maxlength="80" placeholder="כותרת (חובה)" required />
          </label>

          <!-- תיאור -->
          <label class="f-field">
            <span class="f-label">תיאור</span>
            <textarea id="evtDesc" name="desc" rows="3" class="f-input"
                      placeholder="הוסיפו תיאור (לא חובה)"></textarea>
          </label>

          <!-- תאריך -->
          <label class="f-field">
            <span class="f-label">תאריך</span>
            <input id="evtDate" name="date" type="date" class="f-input" required />
          </label>

          <!-- שעה -->
          <label class="f-field">
            <span class="f-label">שעה</span>
            <input id="evtTime" name="time" type="time" class="f-input" required />
          </label>

          <!-- Mic: its own centered row -->
          <div class="create-mic-row">
            <button type="button" class="mic-btn" id="micBtn" aria-label="דברו, המיקרופון פתוח">
              <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                <path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2Zm-5 9a1 1 0 0 0 1-1v-2h-2v2a1 1 0 0 0 1 1Z"/>
              </svg>
            </button>
          </div>

          <!-- Actions: Save (left) | Cancel (right). Physical sides, not RTL mirrored -->
          <div class="create-actions">
            <button type="submit" class="c-btn c-btn--primary btn-save">שמירה</button>
            <button type="button" class="c-btn c-btn--ghost btn-cancel" data-close>ביטול</button>
          </div>
        </form>
      </section>
    `;

    document.body.appendChild($modal);

    // close interactions
    $modal.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]') || e.target === $modal) closeCreateModal();
    });
    document.addEventListener('keydown', onEsc);

    // mic (Web Speech API – fills the *description* textarea)
    wireMic($modal);
    // submit/save
    wireSave($modal);
  }

  // defaults every time it opens
  const f = $modal.querySelector('#createForm');
  f.reset();
  f.querySelector('#evtDate').value = picked;
  f.querySelector('#evtTime').value = hhmm(new Date());

  requestAnimationFrame(() => $modal.classList.add('is-open'));
}

export function closeCreateModal() {
  if (!$modal) return;
  $modal.classList.remove('is-open');
}
function onEsc(e){ if (e.key === 'Escape') closeCreateModal(); }

// ---- mic wiring ----
function wireMic(root){
  const btn = root.querySelector('#micBtn');
  if (!btn) return;

  let rec, active = false;
  const TextArea = () => root.querySelector('#evtDesc');

  const start = () => {
    if (active) return;
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return;
      rec = new SR();
      rec.lang = 'he-IL';
      rec.interimResults = true;
      rec.onresult = (ev) => {
        const t = TextArea();
        if (!t) return;
        let str = '';
        for (const r of ev.results) str += r[0].transcript + ' ';
        t.value = str.trim();
      };
      rec.onend = () => { active = false; btn.classList.remove('is-on'); };
      active = true;
      btn.classList.add('is-on');
      rec.start();
    } catch(_){}
  };
  const stop = () => { try { rec && rec.stop(); } catch(_) {} };

  btn.addEventListener('click', () => (active ? stop() : start()));
}

// ---- save wiring ----
function wireSave(root){
  const form = root.querySelector('#createForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    const dk = data.date || keyOf(new Date());
    const tm = data.time || '00:00';
    const tl = (data.title || '').trim() || 'ללא כותרת';
    const desc = (data.desc || '').trim();

    addEvent({ date: dk, time: tm, title: tl, desc, done: false });

    // let views refresh
    document.dispatchEvent(new Event('events-changed'));

    closeCreateModal();
  });
}
