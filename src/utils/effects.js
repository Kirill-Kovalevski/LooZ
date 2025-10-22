// /src/utils/effects.js
// Confetti (✓) + Ink Scratch (✕) + light helpers. No imports from events.js.

let _wired = false;
export function initTaskFX(root = document) {
  if (_wired) return; _wired = true;
}

/* ------------------ CONFETTI ------------------ */
export function fxConfetti(x, y, opts = {}) {
  if (typeof window === 'undefined' || !document?.createElement) return;

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const {
    ms = reduce ? 700 : 1200,
    count = reduce ? 16 : 46,
    gravity = 0.18,
    spread = Math.PI * 2,
    startV = 6.8,
  } = opts;

  const c = document.createElement('canvas');
  const ctx = c.getContext && c.getContext('2d', { alpha: true });
  if (!ctx) return;

  Object.assign(c.style, {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '2147483647'
  });

  const { innerWidth: W, innerHeight: H, devicePixelRatio } = window;
  const dpr = Math.max(1, Math.min(2, devicePixelRatio || 1));
  c.width  = Math.floor(W * dpr);
  c.height = Math.floor(H * dpr);
  document.body.appendChild(c);

  const cx = (typeof x === 'number' && !Number.isNaN(x)) ? x : W / 2;
  const cy = (typeof y === 'number' && !Number.isNaN(y)) ? y : H / 2;
  const ox = Math.floor(cx * dpr);
  const oy = Math.floor(cy * dpr);

  const colors = ['#FFE067','#F7C843','#9CC6FF','#6EA8FF','#C8F3C1','#FF9FB3','#FFD2A6'];
  const shapes = ['rect','circ','tri'];

  const parts = Array.from({ length: count }, () => {
    const ang = (Math.random() - 0.5) * spread;
    const spd = (0.6 + Math.random() * 0.9) * startV;
    return {
      x: ox, y: oy,
      vx: Math.cos(ang) * spd * dpr,
      vy: Math.sin(ang) * spd * dpr - 6.5 * dpr,
      r: 2 + Math.random() * 4.2,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.45,
      col: colors[(Math.random() * colors.length) | 0],
      shape: shapes[(Math.random() * shapes.length) | 0],
      life: 0.7 + Math.random() * 0.6
    };
  });

  const start = performance.now();
  let rafId = 0;

  function cleanup() {
    try { document.body.removeChild(c); } catch {}
    if (rafId) cancelAnimationFrame(rafId);
  }

  function tick(t) {
    const k = (t - start) / ms;
    if (k >= 1) { cleanup(); return; }

    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of parts) {
      const alpha = Math.max(0, 1 - (k / p.life));
      if (alpha <= 0) continue;

      p.vy += gravity * dpr;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.col;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
      } else if (p.shape === 'tri') {
        ctx.beginPath();
        ctx.moveTo(0, -p.r);
        ctx.lineTo(p.r, p.r);
        ctx.lineTo(-p.r, p.r);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);
  window.addEventListener('pagehide', cleanup, { once: true });
  window.addEventListener('visibilitychange', () => { if (document.hidden) cleanup(); }, { once: true });
}

/* ------------------ INK SCRATCH (✕) ------------------ */
export async function fxInkDelete(cardEl, {
  stroke,
  duration = 700,
  collapseDelay = 120,
  removeDelay = 380
} = {}) {
  if (!cardEl) return;
  const rect = cardEl.getBoundingClientRect();
  const svg  = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','fx-inksvg');
  svg.setAttribute('width', rect.width);
  svg.setAttribute('height', rect.height);
  Object.assign(svg.style, {
    position:'absolute', left:'0', top:'0',
    pointerEvents:'none', mixBlendMode:'multiply'
  });

  const wrap = document.createElement('div');
  wrap.className = 'fx-inkwrap';
  Object.assign(wrap.style, { position:'absolute', inset:'0' });
  wrap.appendChild(svg);

  const cs = getComputedStyle(document.documentElement);
  const ink = stroke || cs.getPropertyValue('--ink').trim() || '#151515';

  const posWas = getComputedStyle(cardEl).position;
  if (posWas === 'static') cardEl.style.position = 'relative';
  cardEl.appendChild(wrap);

  const strokes = 5 + Math.floor(Math.random()*4);
  for (let i=0;i<strokes;i++){
    const y = (i+0.7) * (rect.height/(strokes+0.6));
    const segs = 6 + Math.floor(Math.random()*4);
    const pts = [];
    for (let s=0;s<=segs;s++){
      const x = (s/segs) * rect.width;
      const jx = (Math.random()-0.5) * (rect.height*0.06);
      const jy = (Math.random()-0.5) * (rect.height*0.05);
      pts.push(`${Math.max(0,Math.min(rect.width, x+jx))},${Math.max(0,Math.min(rect.height, y+jy))}`);
    }
    const pl = document.createElementNS('http://www.w3.org/2000/svg','polyline');
    pl.setAttribute('points', pts.join(' '));
    pl.setAttribute('fill','none');
    pl.setAttribute('stroke', ink);
    pl.setAttribute('stroke-linecap','round');
    pl.setAttribute('stroke-linejoin','round');
    pl.setAttribute('stroke-width', String(Math.max(2, rect.height*0.04)));
    const length = 1000 + Math.random()*800;
    pl.style.strokeDasharray = length;
    pl.style.strokeDashoffset = length;
    pl.style.animation = `fx-ink-draw ${duration}ms ease-out forwards`;
    pl.style.animationDelay = (i*40) + 'ms';
    svg.appendChild(pl);
  }

  await new Promise(res => setTimeout(res, duration + collapseDelay));

  const h = cardEl.offsetHeight;
  cardEl.style.height = h + 'px';
  cardEl.style.transition = 'height 260ms ease, opacity 180ms ease';
  cardEl.style.opacity = '0';
  requestAnimationFrame(() => { cardEl.style.height = '0px'; });

  await new Promise(res => setTimeout(res, removeDelay));
  cardEl.remove();
}

/* ------------------ Counters signal ------------------ */
export function bumpTaskCounter(delta) {
  try { document.dispatchEvent(new CustomEvent('task-counter-delta', { detail: delta })); } catch {}
}
