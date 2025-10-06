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
  /* ========= tabs (buttons[data-tab], panels[data-panel]) ========= */


  var tabBtns = Array.prototype.slice.call(document.querySelectorAll('.auth__tab'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.auth__panel'));

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

      goHome(); // same folder, same origin
    });
  }
  /* ========= REGISTER ========= */


  var regForm = document.getElementById('formRegister');

  if (regForm) {
    regForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = val(regForm, 'input[name="name"]');
      var email = val(regForm, 'input[name="email"]').trim().toLowerCase();
      var pass = val(regForm, 'input[name="password"]');
      var conf = val(regForm, 'input[name="confirm"]');

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

      try {
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