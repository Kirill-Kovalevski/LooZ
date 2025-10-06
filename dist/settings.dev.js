"use strict";

// settings.js — page behaviour (back, share, plan, logout)
(function () {
  'use strict'; // --- Back (safe both with/without history, PWA-friendly)

  (function () {
    var back = document.getElementById('sBack');
    if (!back) return;
    back.addEventListener('click', function (e) {
      if (history.length > 1) {
        e.preventDefault();
        var prev = document.referrer;

        if (prev && new URL(prev, location.href).origin === location.origin) {
          history.back(); // iOS PWA fallback

          setTimeout(function () {
            if (document.visibilityState !== 'hidden') location.href = back.href;
          }, 150);
        }
      }
    });
  })(); // --- Share


  var shareBtn = document.getElementById('btnShare');

  if (shareBtn) {
    shareBtn.addEventListener('click', function _callee() {
      var url;
      return regeneratorRuntime.async(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              url = location.origin + location.pathname.replace(/settings\.html$/i, 'index.html');
              _context.prev = 1;

              if (!navigator.share) {
                _context.next = 7;
                break;
              }

              _context.next = 5;
              return regeneratorRuntime.awrap(navigator.share({
                title: 'LooZ',
                text: 'תצטרפו אליי ל־LooZ',
                url: url
              }));

            case 5:
              _context.next = 10;
              break;

            case 7:
              _context.next = 9;
              return regeneratorRuntime.awrap(navigator.clipboard.writeText(url));

            case 9:
              alert('הקישור הועתק!');

            case 10:
              _context.next = 14;
              break;

            case 12:
              _context.prev = 12;
              _context.t0 = _context["catch"](1);

            case 14:
            case "end":
              return _context.stop();
          }
        }
      }, null, null, [[1, 12]]);
    });
  } // --- Plan modal


  var planBtn = document.getElementById('btnPlan');
  var dlg = document.getElementById('planDlg');

  if (planBtn && dlg) {
    planBtn.addEventListener('click', function () {
      return dlg.showModal();
    });
    dlg.querySelectorAll('.plan').forEach(function (el) {
      el.addEventListener('click', function () {
        var plan = el.getAttribute('data-plan') || 'free';
        localStorage.setItem('looz:plan', plan);
        dlg.close();
        alert(plan === 'pro' ? 'ברוכה הבאה ל־Premium ✨' : 'נשארת על Free');
      });
    });
  } // --- Logout (works with auth-guard.js if present, otherwise falls back)


  var logoutBtn = document.getElementById('btnLogout');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      if (!confirm('להתנתק?')) return; // Prefer the guard’s canonical logout (clears all keys + redirects)

      if (typeof window.logout === 'function') {
        window.logout();
        return;
      } // Fallback: clear all known keys and go to auth screen


      try {
        localStorage.removeItem('authUser'); // actually used by your login/register

        localStorage.removeItem('auth.user');
        localStorage.removeItem('auth.token');
        localStorage.setItem('looz:loggedOut', '1');
        sessionStorage.removeItem('auth.session');
      } catch (_) {}

      location.href = 'auth.html?loggedout=1';
    });
  }
})();