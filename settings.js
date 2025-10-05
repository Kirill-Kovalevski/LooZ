// settings.js — page behaviour (back, share, plan, logout)
(function () {
  'use strict';

 // --- Back (enhanced: works with/without history, PWA-safe)
(() => {
  const back = document.getElementById('sBack');
  if (!back) return;

  // If there is history, use it; otherwise the link's href is the fallback
  back.addEventListener('click', (e) => {
    // Some environments (file://, standalone PWA) report small history lengths
    if (history.length > 1) {
      e.preventDefault();
      const prev = document.referrer;
      // If referrer is same-origin, go back; else let the href work
      if (prev && new URL(prev, location.href).origin === location.origin) {
        history.back();
        // iOS Safari PWA sometimes ignores back—fallback after 150ms
        setTimeout(() => { if (document.visibilityState !== 'hidden') location.href = back.href; }, 150);
      }
    }
  });
})();


  // Share
  const shareBtn = document.getElementById('btnShare');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const url = location.origin + location.pathname.replace(/settings\.html$/i, 'index.html');
      try {
        if (navigator.share) await navigator.share({ title: 'LooZ', text: 'תצטרפו אליי ל־LooZ', url });
        else { await navigator.clipboard.writeText(url); alert('הקישור הועתק!'); }
      } catch {}
    });
  }

  // Plan modal
  const planBtn = document.getElementById('btnPlan');
  const dlg = document.getElementById('planDlg');
  if (planBtn && dlg) {
    planBtn.addEventListener('click', () => dlg.showModal());
    dlg.querySelectorAll('.plan').forEach(el => {
      el.addEventListener('click', () => {
        const plan = el.getAttribute('data-plan') || 'free';
        localStorage.setItem('looz:plan', plan);
        dlg.close();
        alert(plan === 'pro' ? 'ברוכה הבאה ל־Premium ✨' : 'נשארת על Free');
      });
    });
  }

  // Logout
  const logout = document.getElementById('btnLogout');
  if (logout) {
    logout.addEventListener('click', () => {
      if (confirm('להתנתק?')) {
        localStorage.removeItem('looz:user');
        location.href = 'index.html';
      }
    });
  }
})();
