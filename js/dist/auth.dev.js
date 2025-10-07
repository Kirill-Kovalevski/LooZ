"use strict";

(function () {
  'use strict';
  /* ========= helpers ========= */

  function okEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim());
  }

  function strongPass(p) {
    p = String(p || '');
    return p.length >= 10 && /[A-Za-z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p);
  } // Paths to your logo assets


  var LIGHT_LOGO_SRC = "icons/main-logo.png";
  var DARK_LOGO_SRC = "icons/dark-logo.png";

  function setAuthLogo(isDark) {
    var img = document.getElementById('authLogo');
    if (img) img.src = isDark ? DARK_LOGO_SRC : LIGHT_LOGO_SRC;
  } // Always navigate within the SAME folder + origin to avoid guard bounce


  function goHome() {
    var here = location.href;
    var base = here.substring(0, here.lastIndexOf('/') + 1);
    location.replace(base + 'index.html');
  } // tiny util to read inputs safely (no optional chaining)


  function val(form, sel) {
    var el = form ? form.querySelector(sel) : null;
    return el ? el.value : '';
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  /* ========= tabs (buttons[data-tab], panels[data-panel]) ========= */


  var tabBtns = $all('.auth__tab');
  var panels = $all('.auth__panel');

  function show(tabKey) {
    for (var i = 0; i < tabBtns.length; i++) {
      var b = tabBtns[i];
      var on = b.getAttribute('data-tab') === tabKey;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    }

    for (var j = 0; j < panels.length; j++) {
      var p = panels[j];
      var onp = p.getAttribute('data-panel') === tabKey;
      p.classList.toggle('is-on', onp);
      if (onp) p.removeAttribute('hidden');else p.setAttribute('hidden', '');
    }
  } // links like <a data-go="register">


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

  for (var k = 0; k < tabBtns.length; k++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        show(btn.getAttribute('data-tab') || 'login');
      });
    })(tabBtns[k]);
  }
  /* ========= password eye ========= */


  document.addEventListener('click', function (e) {
    var btn = e.target;

    while (btn && btn !== document && !(btn.classList && btn.classList.contains('eye'))) {
      btn = btn.parentNode;
    }

    if (!btn || btn === document) return;
    var input = null;
    var prev = btn.previousElementSibling;
    if (prev && prev.tagName === 'INPUT') input = prev;

    if (!input) {
      var parent = btn.parentElement;
      if (parent) input = parent.querySelector('input[type="password"], input[type="text"]');
    }

    if (input) input.type = input.type === 'password' ? 'text' : 'password';
  });
  /* ========= THEME: apply + toggles + logo visibility ========= */

  (function () {
    var root = document.documentElement;
    var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    var chk = document.getElementById('ttInput'); // sun/moon checkbox style

    var ts = document.querySelector('.theme-switch'); // 2-button style

    function logos(isDark) {
      var lights = document.querySelectorAll('.topbar .logo--light, .looz-logo .brand-logo--light');
      var darks = document.querySelectorAll('.topbar .logo--dark,  .looz-logo .brand-logo--dark');
      lights.forEach(function (el) {
        if (el) el.hidden = isDark;
      });
      darks.forEach(function (el) {
        if (el) el.hidden = !isDark;
      });
    }

    function currentTheme() {
      var t = root.getAttribute('data-theme');
      if (t) return t;
      return mq && mq.matches ? 'dark' : 'light';
    }

    function apply(theme) {
      var root = document.documentElement;
      var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');

      if (theme === 'light' || theme === 'dark') {
        root.setAttribute('data-theme', theme);

        try {
          localStorage.setItem('theme', theme);
        } catch (_) {}
      } else {
        root.removeAttribute('data-theme'); // follow system

        try {
          localStorage.removeItem('theme');
        } catch (_) {}
      }

      var isDark = theme ? theme === 'dark' : mq && mq.matches; // keep toggle UI in sync if you have it

      var chk = document.getElementById('ttInput');
      if (chk) chk.checked = isDark;
      document.querySelectorAll('.theme-switch .ts-btn').forEach(function (b) {
        b && b.setAttribute('aria-pressed', b.getAttribute('data-theme') === (isDark ? 'dark' : 'light') ? 'true' : 'false');
      }); // 🔁 swap the single auth logo

      setAuthLogo(isDark);
    } // init from saved/system


    var saved = null;

    try {
      saved = localStorage.getItem('theme');
    } catch (_) {}

    apply(saved || null); // wire controls

    if (chk) {
      chk.addEventListener('change', function () {
        apply(chk.checked ? 'dark' : 'light');
      });
    }

    if (ts) {
      var lightBtn = ts.querySelector('.ts-btn[data-theme="light"]');
      var darkBtn = ts.querySelector('.ts-btn[data-theme="dark"]');
      lightBtn && lightBtn.addEventListener('click', function () {
        apply('light');
      });
      darkBtn && darkBtn.addEventListener('click', function () {
        apply('dark');
      });
    }

    mq && mq.addEventListener && mq.addEventListener('change', function () {
      if (!localStorage.getItem('theme')) apply(null);
    });
  })();
  /* ========= LOGIN ========= */


  var loginForm = document.getElementById('formLogin');

  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = val(loginForm, 'input[name="email"]').trim().toLowerCase();
      var pass = val(loginForm, 'input[name="password"]');

      if (!okEmail(email)) {
        alert('אימייל לא תקין');
        return;
      }

      if (!pass) {
        alert('נדרשת סיסמה');
        return;
      } // ===== success: set session (triple) and go home =====


      var user = {
        id: Date.now(),
        email: email,
        name: email.split('@')[0]
      };

      try {
        localStorage.setItem('authUser', JSON.stringify(user)); // primary key app expects

        sessionStorage.setItem('authUser', JSON.stringify(user)); // redundancy for guard

        localStorage.removeItem('looz:loggedOut');
        localStorage.setItem('looz:justLoggedIn', '1');
        document.cookie = "looz_auth=1; Max-Age=604800; Path=/; SameSite=Lax"; // 7 days
      } catch (_) {}

      goHome();
    });
  }
  /* ========= REGISTER ========= */
  // Support either #formRegister (old) or #registerForm (new)


  var regForm = document.getElementById('formRegister') || document.getElementById('registerForm');

  if (regForm) {
    regForm.addEventListener('submit', function (e) {
      e.preventDefault(); // Prefer explicit first/last IDs if present; otherwise fallback to single "name" field

      var first = (document.getElementById('regFirstName') && document.getElementById('regFirstName').value || '').trim();
      var last = (document.getElementById('regLastName') && document.getElementById('regLastName').value || '').trim();
      var name = first || last ? first && last ? first + ' ' + last : first || last : val(regForm, 'input[name="name"]').trim(); // Email / pass / confirm: prefer reg* IDs, fallback to name attrs

      var email = (document.getElementById('regEmail') && document.getElementById('regEmail').value || val(regForm, 'input[name="email"]')).trim().toLowerCase();
      var pass = document.getElementById('regPassword') && document.getElementById('regPassword').value || val(regForm, 'input[name="password"]');
      var conf = document.getElementById('regConfirm') && document.getElementById('regConfirm').value || val(regForm, 'input[name="confirm"]');

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
      }; // store profile for greeting on home (uses firstName if available)

      var profile = {
        firstName: first || name.split(' ')[0] || '',
        lastName: last || '',
        name: name
      };

      try {
        localStorage.setItem('profile', JSON.stringify(profile));
        localStorage.setItem('authUser', JSON.stringify(user));
        sessionStorage.setItem('authUser', JSON.stringify(user));
        localStorage.removeItem('looz:loggedOut');
        localStorage.setItem('looz:justLoggedIn', '1');
        document.cookie = "looz_auth=1; Max-Age=604800; Path=/; SameSite=Lax";
      } catch (_) {}

      goHome();
    });
  }
  /* ========= FORGOT ========= */


  var forgotForm = document.getElementById('formForgot');

  if (forgotForm) {
    forgotForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = val(forgotForm, 'input[name="email"]').trim().toLowerCase();

      if (!okEmail(email)) {
        alert('אימייל לא תקין');
        return;
      }

      alert('שלחנו (דמו) קישור לאיפוס ל־' + email);
      show('login');
    });
  } // default view


  show('login');
})();