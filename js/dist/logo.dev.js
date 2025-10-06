"use strict";

// js/logo.js — smart home/back navigation (prevents flicker reloads)
(function () {
  'use strict'; // Define your home page (index.html in the same folder)

  var HOME = new URL('index.html', location.href).href; // Compare URLs safely

  function same(a, b) {
    try {
      a = new URL(a, location.href);
      b = new URL(b, location.href);
      return a.origin === b.origin && a.pathname === b.pathname;
    } catch (_) {
      return false;
    }
  } // Intercept clicks on logo or back buttons


  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a.looz-logo, #sBack, a[href$="index.html"]');
    if (!a) return;
    e.preventDefault(); // Already on home? → do nothing (no reload flicker)

    if (same(location.href, HOME)) return; // Came from home and history is available → go back (instant, no repaint)

    if (document.referrer && same(document.referrer, HOME) && history.length > 1) {
      history.back();
      return;
    } // Otherwise → replace with home (no extra history entry)


    location.replace(HOME);
  });
})();