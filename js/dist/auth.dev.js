"use strict";

/* ===================================================================
   auth.js — full drop-in (LooZ)
   - Tabs (login / register / forgot)
   - Password eye toggle
   - Theme system (sun/moon pill + optional 2-button switch)
     • Single <img id="authLogo"> logo, no-flicker PNG swap
     • Disables transitions briefly to avoid bg lag
   - Register stores first/last for home greeting
   - Demo login/forgot flows using local/session storage
   =================================================================== */
(function () {
  'use strict';
  /* --------------------- Utilities --------------------- */

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function val(form, sel) {
    var el = form ? form.querySelector(sel) : null;
    return el ? el.value : '';
  }

  function okEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim());
  }

  function strongPass(p) {
    p = String(p || '');
    return p.length >= 10 && /[A-Za-z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);
  }

  function goHome() {
    // Always navigate within the same folder to avoid path issues
    var here = location.href;
    var base = here.substring(0, here.lastIndexOf('/') + 1);
    location.replace(base + 'index.html');
  }
  /* --------------------- Tabs (login/register/forgot) --------------------- */


  var tabBtns = $all('.auth__tab'); // optional tabs

  var panels = $all('.auth__panel, .panel'); // support your markup

  function show(panelKey) {
    tabBtns.forEach(function (b) {
      var on = b.getAttribute('data-tab') === panelKey;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panels.forEach(function (p) {
      var onp = p.getAttribute('data-panel') === panelKey;
      p.classList.toggle('is-on', onp);
      if (onp) p.removeAttribute('hidden');else p.setAttribute('hidden', '');
    });
  } // Buttons/text links with [data-go]


  document.addEventListener('click', function (e) {
    var n = e.target;

    while (n && n !== document && !(n.getAttribute && n.hasAttribute('data-go'))) {
      n = n.parentNode;
    }

    if (n && n !== document && n.hasAttribute('data-go')) {
      e.preventDefault();
      show(n.getAttribute('data-go'));
    }
  });
  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      show(btn.getAttribute('data-tab') || 'login');
    });
  });
  /* --------------------- Password eye toggle --------------------- */

  document.addEventListener('click', function (e) {
    var btn = e.target;

    while (btn && btn !== document && !(btn.classList && btn.classList.contains('eye'))) {
      btn = btn.parentNode;
    }

    if (!btn || btn === document) return;
    var field = null;
    var prev = btn.previousElementSibling;
    if (prev && prev.tagName === 'INPUT') field = prev;

    if (!field) {
      var root = btn.parentElement;
      if (root) field = root.querySelector('input[type="password"], input[type="text"]');
    }

    if (field) field.type = field.type === 'password' ? 'text' : 'password';
  });
  /* --------------------- Theme system (no-flicker) --------------------- */
  // Your PNG assets

  var LIGHT_LOGO_SRC = 'icons/main-logo.png';
  var DARK_LOGO_SRC = 'icons/dark-logo.png'; // Preload both logos (avoid network/decoding lag)

  (function preloadLogos() {
    [LIGHT_LOGO_SRC, DARK_LOGO_SRC].forEach(function (src) {
      var i = new Image();
      i.decoding = 'async';
      i.loading = 'eager';
      i.src = src;
    });
  })(); // Swap single <img id="authLogo">, fallback to toggling .logo--light/.logo--dark if present


  function setAuthLogoSync(isDark) {
    var img = document.getElementById('authLogo');

    if (img) {
      var next = isDark ? DARK_LOGO_SRC : LIGHT_LOGO_SRC;
      if (img.getAttribute('src') !== next) img.setAttribute('src', next);
      return;
    } // Fallback: old two-logo markup


    $all('.topbar .logo--light').forEach(function (el) {
      if (el) el.hidden = isDark;
    });
    $all('.topbar .logo--dark').forEach(function (el) {
      if (el) el.hidden = !isDark;
    });
  } // No-flicker async swap (decode before fade)


  function setAuthLogo(isDark) {
    var img = document.getElementById('authLogo');

    if (!img) {
      setAuthLogoSync(isDark);
      return Promise.resolve();
    }

    var next = isDark ? DARK_LOGO_SRC : LIGHT_LOGO_SRC;
    if (img.getAttribute('src') === next) return Promise.resolve();
    return new Promise(function (resolve) {
      var pre = new Image();
      pre.src = next;

      function done() {
        img.style.opacity = '0';
        requestAnimationFrame(function () {
          img.setAttribute('src', next);
          img.style.opacity = '1';
          resolve();
        });
      }

      if (pre.decode) pre.decode().then(done)["catch"](done);else pre.onload = done, pre.onerror = done;
    });
  }

  (function themeController() {
    var root = document.documentElement;
    var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    var chk = document.getElementById('ttInput'); // sun/moon pill (checkbox)

    var ts = document.querySelector('.theme-switch'); // optional 2-button switch

    function currentTheme() {
      var t = root.getAttribute('data-theme');
      return t ? t : mq && mq.matches ? 'dark' : 'light';
    }

    function syncUI(isDark) {
      if (chk) chk.checked = !!isDark;

      if (ts) {
        $all('.theme-switch .ts-btn').forEach(function (b) {
          var on = b.getAttribute('data-theme') === (isDark ? 'dark' : 'light');
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      }
    }

    function apply(theme) {
      // 1) Persist or follow system
      if (theme === 'light' || theme === 'dark') {
        root.setAttribute('data-theme', theme);

        try {
          localStorage.setItem('theme', theme);
        } catch (_) {}
      } else {
        root.removeAttribute('data-theme');

        try {
          localStorage.removeItem('theme');
        } catch (_) {}
      } // 2) Compute active and freeze transitions to prevent gradient lag


      var isDark = theme ? theme === 'dark' : mq && mq.matches;
      root.classList.add('theme-fx-off'); // 3) Swap logo without flicker, then unfreeze transitions

      setAuthLogo(isDark)["finally"](function () {
        requestAnimationFrame(function () {
          setTimeout(function () {
            root.classList.remove('theme-fx-off');
          }, 120);
        });
      }); // 4) Sync any toggle UI

      syncUI(isDark);
    } // expose in case other scripts want to change theme


    window.__authApplyTheme = apply; // init from saved/system

    var saved = null;

    try {
      saved = localStorage.getItem('theme');
    } catch (_) {}

    apply(saved || null); // wire controls

    if (chk) chk.addEventListener('change', function () {
      apply(chk.checked ? 'dark' : 'light');
    });

    if (ts) {
      var lbtn = ts.querySelector('.ts-btn[data-theme="light"]');
      var dbtn = ts.querySelector('.ts-btn[data-theme="dark"]');
      lbtn && lbtn.addEventListener('click', function () {
        apply('light');
      });
      dbtn && dbtn.addEventListener('click', function () {
        apply('dark');
      });
    } // follow system when no explicit choice


    mq && mq.addEventListener && mq.addEventListener('change', function () {
      if (!localStorage.getItem('theme')) apply(null);
    }); // keep in sync across tabs

    window.addEventListener('storage', function (e) {
      if (e.key === 'theme') apply(localStorage.getItem('theme') || null);
    });
  })();
  /* --------------------- LOGIN --------------------- */


  var loginForm = $('#formLogin') || $('#loginForm') || $('.auth__panel[data-panel="login"] form');

  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (val(loginForm, 'input[name="email"]') || '').trim().toLowerCase();
      var pass = val(loginForm, 'input[name="password"]');

      if (!okEmail(email)) {
        alert('אימייל לא תקין');
        return;
      }

      if (!pass) {
        alert('נדרשת סיסמה');
        return;
      }

      var user = {
        id: Date.now(),
        email: email,
        name: email.split('@')[0]
      };

      try {
        localStorage.setItem('authUser', JSON.stringify(user));
        sessionStorage.setItem('authUser', JSON.stringify(user));
        localStorage.removeItem('looz:loggedOut');
        localStorage.setItem('looz:justLoggedIn', '1');
        document.cookie = 'looz_auth=1; Max-Age=604800; Path=/; SameSite=Lax';
      } catch (_) {}

      goHome();
    });
  }
  /* --------------------- REGISTER --------------------- */


  var regForm = $('#formRegister') || $('#registerForm') || $('.auth__panel[data-panel="register"] form');

  if (regForm) {
    regForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var first = ($('#regFirstName') && $('#regFirstName').value || '').trim();
      var last = ($('#regLastName') && $('#regLastName').value || '').trim(); // Fallback to single name field if needed

      var nameField = first || last ? '' : (val(regForm, 'input[name="name"]') || '').trim();
      var name = first || last ? first && last ? first + ' ' + last : first || last : nameField;
      var email = ($('#regEmail') && $('#regEmail').value || val(regForm, 'input[name="email"]')).trim().toLowerCase();
      var pass = $('#regPassword') && $('#regPassword').value || val(regForm, 'input[name="password"]');
      var conf = $('#regConfirm') && $('#regConfirm').value || val(regForm, 'input[name="confirm"]');

      if (!name) {
        alert('נדרש שם');
        return;
      }

      if (!okEmail(email)) {
        alert('אימייל לא תקין');
        return;
      }

      if (!strongPass(pass)) {
        alert('סיסמה: 10+ תווים, אות, מספר וסימן');
        return;
      }

      if (conf !== pass) {
        alert('אימות סיסמה לא תואם');
        return;
      }

      var user = {
        id: Date.now(),
        email: email,
        name: name
      };
      var profile = {
        firstName: first || name.split(' ')[0] || '',
        lastName: last || name.split(' ').slice(1).join(' ') || '',
        name: name
      };

      try {
        localStorage.setItem('profile', JSON.stringify(profile)); // home greeting uses this
        // Mirror to authUser as a fallback

        var authUser = {
          id: user.id,
          email: email,
          name: name,
          firstName: profile.firstName
        };
        localStorage.setItem('authUser', JSON.stringify(authUser));
        sessionStorage.setItem('authUser', JSON.stringify(authUser));
        localStorage.removeItem('looz:loggedOut');
        localStorage.setItem('looz:justLoggedIn', '1');
        document.cookie = 'looz_auth=1; Max-Age=604800; Path=/; SameSite=Lax';
      } catch (_) {}

      goHome();
    });
  }
  /* --------------------- FORGOT --------------------- */


  var forgotForm = $('#formForgot') || $('.auth__panel[data-panel="forgot"] form');

  if (forgotForm) {
    forgotForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (val(forgotForm, 'input[name="email"]') || '').trim().toLowerCase();

      if (!okEmail(email)) {
        alert('אימייל לא תקין');
        return;
      }

      alert('שלחנו (דמו) קישור לאיפוס ל־ ' + email);
      show('login');
    });
  } // Default view


  show('login');
})();