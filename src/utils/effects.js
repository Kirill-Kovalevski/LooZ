// src/utils/effects.js

// Simple confetti burst at x,y (viewport coords)
export function confetti(x, y){
  const root = document.createElement('div');
  root.className = 'fx-confetti';
  document.body.appendChild(root);

  const COUNT = 28;
  for (let i = 0; i < COUNT; i++){
    const c = document.createElement('i');
    c.className = 'fx-c';
    const dx = (Math.random()*240 - 120) + 'px';
    const dy = (Math.random()*-240) + 'px';
    const rot = (Math.random()*720 - 360) + 'deg';
    const t   = (600 + Math.random()*600) + 'ms';
    c.style.setProperty('--dx', dx);
    c.style.setProperty('--dy', dy);
    c.style.setProperty('--r', rot);
    c.style.setProperty('--t', t);
    c.style.left = x + 'px';
    c.style.top  = y + 'px';
    root.appendChild(c);
  }
  setTimeout(() => root.remove(), 1200);
}

// tiny utility to add/remove a class briefly (for press feedback)
export function pulse(el, cls = 'is-pressed', ms = 150){
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}
// /src/utils/effects.js
// Visual effects + small helpers for task actions (V = confetti, X = ink delete)
// Works RTL/LTR. No deps.

// ---------------- Confetti (subtle, graceful, big spread) ----------------
export function confetti(x, y, opts = {}) {
  const root = document.createElement('div');
  root.className = 'fx-confetti';
  root.style.left = `${x}px`;
  root.style.top  = `${y}px`;
  document.body.appendChild(root);

  const COUNT = opts.count ?? 32;
  const LIFETIME = opts.ms ?? 1200;

  for (let i = 0; i < COUNT; i++) {
    const p = document.createElement('i');
    p.className = 'fx-c';
    // random travel
    const angle = (Math.random() * Math.PI) - (Math.PI / 2); // up-left..up-right
    const speed = 180 + Math.random() * 240;                 // px
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed - (80 + Math.random() * 80); // initial burst upward
    // random spin & size
    const rot = (Math.random() * 720 - 360) + 'deg';
    const s   = 6 + Math.random() * 6;

    p.style.setProperty('--dx', `${dx}px`);
    p.style.setProperty('--dy', `${dy}px`);
    p.style.setProperty('--rot', rot);
    p.style.width  = `${s}px`;
    p.style.height = `${s * (0.5 + Math.random())}px`;
    // tiny delay so they don't all start at the same millisecond
    p.style.animationDelay = (Math.random() * 60) + 'ms';
    root.appendChild(p);
  }

  // cleanup
  window.setTimeout(() => root.remove(), LIFETIME + 120);
}

// ---------------- Ink “scratch + fill” delete ----------------
export function inkDelete(taskEl) {
  if (!taskEl) return;
  taskEl.classList.add('fx-ink-removing');

  // optional: strike-through quickly before fill
  taskEl.classList.add('fx-ink-strike');

  // after animation ends, remove from DOM
  const removeAfter = () => {
    taskEl.removeEventListener('animationend', removeAfter);
    taskEl.remove();
  };
  taskEl.addEventListener('animationend', removeAfter);
}

// ---------------- Mark done (fade + remove) ----------------
export function markDone(taskEl) {
  if (!taskEl) return;
  taskEl.classList.add('fx-done');
  window.setTimeout(() => taskEl.remove(), 420);
}

// ---------------- Task counter helpers ----------------
export function bumpTaskCounter(delta = -1) {
  // Decrease remaining tasks by default (delta = -1)
  const nodes = document.querySelectorAll('.task-count, [data-role="task-count"]');
  nodes.forEach((n) => {
    const current = parseInt((n.textContent || '').replace(/[^\d]/g, ''), 10) || 0;
    const next = Math.max(0, current + delta);
    n.textContent = String(next);
  });

  // If you keep profile totals in localStorage, lightly sync:
  try {
    const key = 'profile.task.count';
    const cur = parseInt(localStorage.getItem(key) || '0', 10) || 0;
    const next = Math.max(0, cur + delta);
    localStorage.setItem(key, String(next));
  } catch (_) {}
}

// ---------------- One-time initializer: wire V/X buttons ----------------
export function initTaskFX(root = document) {
  root.addEventListener('click', (ev) => {
    const doneBtn = ev.target.closest('.btn-v, [data-action="done"]');
    const delBtn  = ev.target.closest('.btn-x, [data-action="delete"]');

    if (doneBtn) {
      const task = doneBtn.closest('.task, .task-item, li, .card');
      confetti(ev.clientX, ev.clientY, { count: 36, ms: 1200 });
      markDone(task);
      bumpTaskCounter(-1);
    }

    if (delBtn) {
      const task = delBtn.closest('.task, .task-item, li, .card');
      inkDelete(task);
      bumpTaskCounter(-1);
    }
  }, { passive: true });
}
