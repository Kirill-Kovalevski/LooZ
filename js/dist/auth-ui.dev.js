"use strict";

// js/auth-ui.js — UI helpers so everything works now
(function () {
  'use strict';

  function showPanel(key) {
    document.querySelectorAll('.panel').forEach(function (p) {
      return p.classList.remove('is-on');
    });
    var to = document.querySelector('.panel[data-panel="' + key + '"]');
    if (to) to.classList.add('is-on');
  } // top icon buttons (register / forgot) + any [data-go]


  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-go]');
    if (!a) return;
    e.preventDefault();
    showPanel(a.getAttribute('data-go'));
  }); // eye toggles

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.input__eye');
    if (!btn) return;
    e.preventDefault();
    var input = btn.parentElement.querySelector('.input__el');
    if (!input) return;
    var isPw = input.type === 'password';
    input.type = isPw ? 'text' : 'password';
    btn.textContent = isPw ? '🙈' : '👁';
  }); // social buttons — demo sign in: set session + go home

  function setSession(user) {
    try {
      localStorage.setItem('authUser', JSON.stringify(user));
      sessionStorage.setItem('authUser', JSON.stringify(user));
      localStorage.removeItem('looz:loggedOut');
      localStorage.setItem('looz:justLoggedIn', '1');
      document.cookie = "looz_auth=1; Max-Age=604800; Path=/; SameSite=Lax";
    } catch (_) {}
  }

  function goHome() {
    var base = location.href.substring(0, location.href.lastIndexOf('/') + 1);
    location.replace(base + 'index.html');
  }

  document.addEventListener('click', function (e) {
    var p = e.target.closest && e.target.closest('.pbtn[data-provider]');
    if (!p) return;
    e.preventDefault();
    var provider = p.getAttribute('data-provider');
    setSession({
      id: Date.now(),
      email: provider + '@looz.example',
      name: provider,
      provider: provider
    });
    goHome();
  });
})();