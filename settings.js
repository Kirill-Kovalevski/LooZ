// settings.js — page behaviour (back, share, plan, logout)
(function () {
  'use strict';

  // --- Back (safe both with/without history, PWA-friendly)
  (() => {
    const back = document.getElementById('sBack');
    if (!back) return;

    back.addEventListener('click', (e) => {
      if (history.length > 1) {
        e.preventDefault();
        const prev = document.referrer;
        if (prev && new URL(prev, location.href).origin === location.origin) {
          history.back();
          // iOS PWA fallback
          setTimeout(() => {
            if (document.visibilityState !== 'hidden') location.href = back.href;
          }, 150);
        }
      }
    });
  })();

  // --- Share
  const shareBtn = document.getElementById('btnShare');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const url = location.origin + location.pathname.replace(/settings\.html$/i, 'index.html');
      try {
        if (navigator.share) {
          await navigator.share({ title: 'LooZ', text: 'תצטרפו אליי ל־LooZ', url });
        } else {
          await navigator.clipboard.writeText(url);
          alert('הקישור הועתק!');
        }
      } catch {}
    });
  }

  // --- Plan modal
  const planBtn = document.getElementById('btnPlan');
  const dlg = document.getElementById('planDlg');
  if (planBtn && dlg) {
    planBtn.addEventListener('click', () => dlg.showModal());
    dlg.querySelectorAll('.plan').forEach((el) => {
      el.addEventListener('click', () => {
        const plan = el.getAttribute('data-plan') || 'free';
        localStorage.setItem('looz:plan', plan);
        dlg.close();
        alert(plan === 'pro' ? 'ברוכה הבאה ל־Premium ✨' : 'נשארת על Free');
      });
    });
  }

  // --- Logout (works with auth-guard.js if present, otherwise falls back)
  const logoutBtn = document.getElementById('btnLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (!confirm('להתנתק?')) return;

      // Prefer the guard’s canonical logout (clears all keys + redirects)
      if (typeof window.logout === 'function') {
        window.logout();
        return;
      }

      // Fallback: clear all known keys and go to auth screen
      try {
        localStorage.removeItem('authUser');     // actually used by your login/register
        localStorage.removeItem('auth.user');
        localStorage.removeItem('auth.token');
        localStorage.setItem('looz:loggedOut', '1');
        sessionStorage.removeItem('auth.session');
      } catch (_) {}

      location.href = 'auth.html?loggedout=1';
    });
  }
})();
