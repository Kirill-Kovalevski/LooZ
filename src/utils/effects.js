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
