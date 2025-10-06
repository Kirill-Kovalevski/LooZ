/* auth-guard.js — DEV-safe guard: no redirect on localhost, strict in prod */
(function () {
  'use strict';

  // ---------- helpers ----------
  function appUrl(file){
    var b = document.querySelector('base');
    if (b && b.href) return new URL(file, b.href).href;
    if (/github\.io$/.test(location.hostname)) {
      var seg = location.pathname.split('/').filter(Boolean)[0] || '';
      return '/' + (seg ? seg + '/' : '') + file;
    }
    return file;
  }
  function hereIsAuth(){ return /auth\.html(\?|#|$)/i.test(location.pathname + location.search); }
  function hasCookie(name){
    return document.cookie.split(';').some(function (p) { return p.trim().indexOf(name + '=') === 0; });
  }
  function isLoggedIn(){
    try {
      var raw = localStorage.getItem('authUser') || sessionStorage.getItem('authUser');
      if (raw && JSON.parse(raw)) return true;
    } catch(_) {}
    if (hasCookie('looz_auth')) return true;
    return false;
  }

  // ---------- global logout (used by Settings button) ----------
  window.logout = function () {
    try {
      localStorage.removeItem('authUser');
      sessionStorage.removeItem('authUser');
      localStorage.removeItem('auth.user');
      localStorage.removeItem('auth.token');
      localStorage.setItem('looz:loggedOut', '1');
      sessionStorage.removeItem('auth.session');
      document.cookie = "looz_auth=; Max-Age=0; Path=/; SameSite=Lax";
    } catch (_){}
    location.replace(appUrl('auth.html?loggedout=1'));
  };

  // ---------- dev vs prod behavior ----------
  var isLocal =
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.protocol === 'file:';

  // never guard the auth page itself
  if (hereIsAuth()) return;

  // In development: DO NOT redirect. Just warn if not logged in.
  if (isLocal) {
    if (!isLoggedIn()) {
      // Small unobtrusive ribbon so you know guard is bypassed
      var b = document.createElement('div');
      b.textContent = 'DEV MODE: Guard bypassed (not logged in)';
      b.style.cssText =
        'position:fixed;inset:auto 8px 8px auto;background:#1f2937;color:#fbbf24;' +
        'font:12px system-ui;padding:6px 10px;border-radius:999px;z-index:2147483647;opacity:.9';
      document.addEventListener('DOMContentLoaded', function(){ document.body.appendChild(b); });
      console.warn('[auth-guard] DEV: not logged-in, bypassing redirect on', location.origin);
    }
    return; // <-- crucial: no redirect in dev
  }

  // In production: be strict (but patient)
  var maxWait = 1500, waited = 0, step = 75;
  (function check(){
    if (isLoggedIn()) return; // allow page
    waited += step;
    if (waited < maxWait) { setTimeout(check, step); return; }
    // No session → go to login
    location.replace(appUrl('auth.html'));
  })();
})();
