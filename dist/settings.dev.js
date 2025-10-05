"use strict";

// settings.js — page behaviour (back, share, plan, logout)
(function () {
  'use strict'; // --- Back (enhanced: works with/without history, PWA-safe)

  (function () {
    var back = document.getElementById('sBack');
    if (!back) return; // If there is history, use it; otherwise the link's href is the fallback

    back.addEventListener('click', function (e) {
      // Some environments (file://, standalone PWA) report small history lengths
      if (history.length > 1) {
        e.preventDefault();
        var prev = document.referrer; // If referrer is same-origin, go back; else let the href work

        if (prev && new URL(prev, location.href).origin === location.origin) {
          history.back(); // iOS Safari PWA sometimes ignores back—fallback after 150ms

          setTimeout(function () {
            if (document.visibilityState !== 'hidden') location.href = back.href;
          }, 150);
        }
      }
    });
  })(); // Share


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
  } // Plan modal


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
  } // Logout


  var logout = document.getElementById('btnLogout');

  if (logout) {
    logout.addEventListener('click', function () {
      if (confirm('להתנתק?')) {
        localStorage.removeItem('looz:user');
        location.href = 'index.html';
      }
    });
  }
})();