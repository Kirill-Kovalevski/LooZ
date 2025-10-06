"use strict";

(function () {
  var KEY = 'looz:isDark';
  var root = document.documentElement; // --- helpers ---

  var truthy = function truthy(v) {
    return v === true || v === '1' || v === 1 || v === 'true' || v === 'dark';
  };

  var getStored = function getStored() {
    var v = localStorage.getItem(KEY);
    return v == null ? null : truthy(v);
  };

  var apply = function apply(on) {
    root.classList.toggle('is-dark', !!on);
    if (document.body) document.body.classList.toggle('is-dark', !!on);
    root.style.colorScheme = on ? 'dark' : 'light'; // broadcast (both spellings for back-compat)

    var detail = {
      detail: {
        dark: !!on
      }
    };

    try {
      window.dispatchEvent(new CustomEvent('looz:theme', detail));
      window.dispatchEvent(new CustomEvent('looz-theme', detail));
    } catch (_) {}
  }; // --- init (no flash) ---


  var stored = getStored();
  var prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  apply(stored == null ? prefers : stored); // --- public API for pages/buttons ---

  function isDark() {
    return root.classList.contains('is-dark');
  }

  function set(mode) {
    var on = truthy(mode);
    localStorage.setItem(KEY, on ? '1' : '0');
    apply(on);
  }

  function toggle() {
    set(!isDark());
  }

  window.__loozTheme = {
    isDark: isDark,
    set: set,
    toggle: toggle,
    onChange: function onChange(cb) {
      window.addEventListener('looz:theme', function (e) {
        return cb(!!(e.detail && e.detail.dark));
      });
    }
  }; // --- sync page checkboxes if present ---

  function syncToggles() {
    ['pDark', 'setDark'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.checked = isDark();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    ['pDark', 'setDark'].forEach(function (id) {
      var el = document.getElementById(id);

      if (el && !el._loozBound) {
        el._loozBound = true;
        el.addEventListener('change', function () {
          return set(el.checked ? 'dark' : 'light');
        });
      }
    }); // ensure <body> picks the class once it exists

    apply(isDark());
    syncToggles();
  }); // js/theme.js

  (function () {
    var KEY = "loozTheme"; // 'light' | 'dark' | 'system'

    var root = document.documentElement;
    var mq = window.matchMedia("(prefers-color-scheme: dark)");

    function apply(theme) {
      var mode = theme === "system" ? mq.matches ? "dark" : "light" : theme;
      root.setAttribute("data-theme", mode);
      root.style.colorScheme = mode; // form controls, etc.
    }

    function load() {
      return localStorage.getItem(KEY) || "system";
    }

    function save(theme) {
      localStorage.setItem(KEY, theme);
    } // react to system changes only if in "system" mode


    mq.addEventListener("change", function () {
      if (load() === "system") apply("system");
    }); // optional header toggle (cycles: system → dark → light → system)

    document.addEventListener("click", function (e) {
      var btn = e.target.closest("#themeToggle");
      if (!btn) return;
      var curr = load();
      var next = curr === "system" ? "dark" : curr === "dark" ? "light" : "system";
      save(next);
      apply(next);
      btn.setAttribute("aria-label", "\u05DE\u05E6\u05D1 \u05E6\u05D1\u05E2: ".concat(next));
    }); // boot

    apply(load());
  })();

  window.addEventListener('looz:theme', syncToggles);
})();