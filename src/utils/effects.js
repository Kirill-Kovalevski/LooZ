// /src/utils/effects.js
// Visual effects used across views: confetti, mark-done, delete-ink, counters.
// Self-contained: no imports from events.js. Safe no-ops where appropriate.

let _wired = false;

/** Optional global init (kept for compatibility with home.js) */
export function initTaskFX(root = document) {
  if (_wired) return; _wired = true;
  // place to wire global listeners later (sounds, ripples, etc.)
}

/** Confetti burst at viewport (x,y) with upgraded “satisfying” feel */
export function fxConfetti(x, y, opts = {}) {
  const {
    ms = 1200,
    count = 46,
    gravity = 0.18,
    spread = Math.PI * 2,
    startV = 6.8,
  } = opts;

  if (typeof window === 'undefined' || !document?.createElement) return;

  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d', { alpha: true });

  Object.assign(c.style, {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: '2147483647'
  });

  const { innerWidth: W, innerHeight: H } = window;
  c.width = Math.floor(W * dpr);
  c.height = Math.floor(H * dpr);
  document.body.appendChild(c);

  const ox = Math.floor(x * dpr);
  const oy = Math.floor(y * dpr);

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

  let start = performance.now();
  (function tick(t) {
    const k = (t - start) / ms;
    if (k >= 1) { try { document.body.removeChild(c); } catch {} return; }

    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of parts) {
      // ease-out alpha so it feels soft
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
    requestAnimationFrame(tick);
  })(start);
}

/** Quick “done” visual */
export function fxMarkDone(cardEl) {
  if (!cardEl) return;
  cardEl.classList.add('fx-done');
}

/** Quick “ink/scratch” delete visual */
export function fxInkDelete(cardEl) {
  if (!cardEl) return;
  cardEl.classList.add('fx-delete');
}

/**
 * Optional helper so views can signal a visible task counter change.
 * If no one listens, nothing happens.
 */
export function bumpTaskCounter(delta) {
  try {
    document.dispatchEvent(new CustomEvent('task-counter-delta', { detail: delta }));
  } catch {}
}

/* Suggested minimal CSS (put in your global stylesheet):
.fx-done   { opacity:.45; transform:scale(.98); transition:opacity .28s ease, transform .28s ease; }
.fx-delete { opacity:.25; transform:translateX(4px); filter:grayscale(.5); transition:opacity .28s ease, transform .28s ease, filter .28s ease; }
*/
