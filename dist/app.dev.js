"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/* ===== LooZ — Planner App (home) — vFinal.8 ===== */
(function () {
  'use strict';
  /* -------- AUTH GUARD (runs before anything else) -------- */

  (function guard() {
    try {
      var u = localStorage.getItem('authUser') || localStorage.getItem('auth.user');

      if (!u) {
        location.replace('auth.html');
      }
    } catch (_) {
      location.replace('auth.html');
    }
  })();
  /* ===================== Helpers ===================== */


  var $ = function $(sel) {
    var root = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : document;
    return root.querySelector(sel);
  };

  var $$ = function $$(sel) {
    var root = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : document;
    return Array.from(root.querySelectorAll(sel));
  };

  var go = function go(href) {
    return window.location.href = href;
  };

  var pad2 = function pad2(n) {
    return String(n).padStart(2, '0');
  };

  var escapeHtml = function escapeHtml() {
    var s = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
    return s.replace(/[&<>"']/g, function (m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[m];
    });
  };

  var sameDay = function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  };

  var dateKey = function dateKey(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  };

  var fromKey = function fromKey(ymd) {
    var p = (ymd || '').split('-');
    return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
  };

  var startOfWeek = function startOfWeek(d, weekStart) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var diff = (x.getDay() - weekStart + 7) % 7;
    x.setDate(x.getDate() - diff);
    return x;
  };

  var startOfMonth = function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  };

  var addMonths = function addMonths(d, n) {
    return new Date(d.getFullYear(), d.getMonth() + n, 1);
  };

  var HEB_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  /* fixed months (added נובמבר) */

  var HEB_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

  var weekLabel = function weekLabel(d, weekStart) {
    var s = startOfWeek(d, weekStart);
    var e = new Date(s);
    e.setDate(s.getDate() + 6);
    var sM = HEB_MONTHS[s.getMonth()],
        eM = HEB_MONTHS[e.getMonth()];
    return s.getMonth() === e.getMonth() ? "".concat(s.getDate(), "\u2013").concat(e.getDate(), " ").concat(sM, " ").concat(s.getFullYear()) : "".concat(s.getDate(), " ").concat(sM, " \u2013 ").concat(e.getDate(), " ").concat(eM, " ").concat(s.getFullYear());
  };
  /* ===================== DOM refs ===================== */


  var btnProfile = $('#btnProfile');
  var btnMenu = $('#btnMenu');
  var btnCategories = $('#btnCategories');
  var btnSocial = $('#btnSocial');
  if (btnProfile) btnProfile.addEventListener('click', function () {
    return go('profile.html');
  });
  if (btnMenu) btnMenu.addEventListener('click', function () {
    return go('settings.html');
  });
  if (btnCategories) btnCategories.addEventListener('click', function () {
    return go('categories.html');
  });
  if (btnSocial) btnSocial.addEventListener('click', function () {
    return go('social.html');
  });
  var lemonToggle = $('#lemonToggle');
  var appNav = $('#appNav');
  var navPanel = appNav ? appNav.querySelector('.c-nav__panel') : null;
  var titleDay = $('#titleDay');
  var titleDate = $('#titleDate');
  var titleBadge = $('#titleBadge');
  var plannerRoot = $('#planner');
  var btnDay = $('#btnDay');
  var btnWeek = $('#btnWeek');
  var btnMonth = $('#btnMonth');
  var sheet = $('#eventSheet');
  var sheetPanel = sheet ? sheet.querySelector('.c-sheet__panel') : null;
  var sheetClose = sheet ? sheet.querySelector('[data-close]') : null;
  var sheetForm = $('#sheetForm');
  var titleInput = $('#evtTitle');
  var dateInput = $('#evtDate');
  var timeInput = $('#evtTime');
  var subtitleEl = $('.c-subtitle');
  var createOrbBtn = $('.btn-create-orb'); // NEW: static “create event” orb

  /* ===================== Greeting ===================== */

  function getAuth() {
    try {
      var raw = localStorage.getItem('authUser') || localStorage.getItem('auth.user');
      return raw ? JSON.parse(raw) : null;
    } catch (_unused) {
      return null;
    }
  }

  function getProfile() {
    try {
      return JSON.parse(localStorage.getItem('profile') || '{}');
    } catch (_unused2) {
      return {};
    }
  }

  function getDisplayName() {
    var prof = getProfile();
    if (prof.firstName) return prof.firstName;
    if (prof.name) return prof.name;
    var au = getAuth();
    if (au) return au.firstName || au.name || au.displayName || au.email || 'חברה';
    return localStorage.getItem('authName') || 'חברה';
  }

  (function setGreeting() {
    var name = escapeHtml(getDisplayName());
    var au = getAuth();
    var SPECIAL_EMAIL = 'daniellagg21@gmail.com';
    var isSpecial = au && String(au.email || '').toLowerCase() === SPECIAL_EMAIL.toLowerCase();

    if (subtitleEl) {
      subtitleEl.innerHTML = isSpecial ? '<div style="font-weight:800;margin-bottom:.15rem">נשמולית שלי</div>' + '<div>איזה כיף שחזרת <strong>' + name + '</strong></div>' + '<div>לוז מושלם מחכה לך</div>' : 'ברוכים השבים, <strong id="uiName">' + name + '</strong>!<br>מה בלוז היום?';
    }
  })();
  /* ===================== State ===================== */


  var STORAGE_KEY = 'plannerTasks';
  var PREFS_KEY = 'plannerPrefs';

  var loadTasks = function loadTasks() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var a = raw ? JSON.parse(raw) : [];
      return Array.isArray(a) ? a : [];
    } catch (_unused3) {
      return [];
    }
  };

  var saveTasks = function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    } catch (_unused4) {}
  };

  var loadPrefs = function loadPrefs() {
    try {
      return JSON.parse(localStorage.getItem(PREFS_KEY)) || {};
    } catch (_unused5) {
      return {};
    }
  };

  var persistPrefs = function persistPrefs() {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (_unused6) {}
  };

  var prefs = loadPrefs();
  var weekStart = prefs.weekStart === 'mon' ? 1 : 0;
  var state = {
    view: prefs.defaultView || 'month',
    current: new Date(),
    tasks: loadTasks()
  };

  var formatTitle = function formatTitle(d) {
    if (titleDay) titleDay.textContent = HEB_DAYS[d.getDay()];
    if (titleDate) titleDate.textContent = "".concat(pad2(d.getDate()), ".").concat(pad2(d.getMonth() + 1), ".").concat(d.getFullYear());
  };

  var markToday = function markToday() {
    titleBadge && titleBadge.setAttribute('data-today', '1');
  };
  /* ===================== Lemon nav open/close ===================== */


  (function initNav() {
    if (!lemonToggle || !appNav || !navPanel) return;
    appNav.classList.add('u-is-collapsed');
    lemonToggle.setAttribute('aria-expanded', 'false');
    appNav.setAttribute('aria-hidden', 'true');

    function open() {
      appNav.classList.remove('u-is-collapsed');
      appNav.setAttribute('aria-hidden', 'false');
      lemonToggle.setAttribute('aria-expanded', 'true');
      navPanel.style.maxHeight = navPanel.scrollHeight + 'px';
      navPanel.addEventListener('transitionend', function onEnd(e) {
        if (e.propertyName === 'max-height') {
          navPanel.style.maxHeight = '';
          navPanel.removeEventListener('transitionend', onEnd);
        }
      });
    }

    function close() {
      var h = navPanel.scrollHeight;
      navPanel.style.maxHeight = h + 'px';
      void navPanel.offsetHeight;
      navPanel.style.maxHeight = '0px';
      lemonToggle.setAttribute('aria-expanded', 'false');
      appNav.setAttribute('aria-hidden', 'true');
      appNav.classList.add('u-is-collapsed');
    }

    lemonToggle.addEventListener('click', function () {
      var collapsed = appNav.classList.contains('u-is-collapsed') || appNav.getAttribute('aria-hidden') === 'true';
      collapsed ? open() : close();
    });
  })();
  /* ===================== Color scale ===================== */


  function pastelFor(n) {
    var b = n <= 0 ? 0 : Math.min(6, Math.floor((n - 1) / 3) + 1);
    var tones = [{
      fg: '#475569',
      ring: '#e5e7eb'
    }, // 0
    {
      fg: '#0ea5e9',
      ring: '#93c5fd'
    }, // 1
    {
      fg: '#16a34a',
      ring: '#86efac'
    }, // 2
    {
      fg: '#f59e0b',
      ring: '#fde68a'
    }, // 3
    {
      fg: '#a855f7',
      ring: '#ddd6fe'
    }, // 4
    {
      fg: '#db2777',
      ring: '#fbcfe8'
    }, // 5
    {
      fg: '#1d4ed8',
      ring: '#bfdbfe'
    } // 6
    ];
    return _objectSpread({
      band: b
    }, tones[b]);
  }
  /* ===================== Renderers ===================== */


  function render() {
    formatTitle(state.current);
    markToday();
    if (!plannerRoot) return;
    btnDay && btnDay.classList.toggle('is-active', state.view === 'day');
    btnWeek && btnWeek.classList.toggle('is-active', state.view === 'week');
    btnMonth && btnMonth.classList.toggle('is-active', state.view === 'month');
    if (state.view === 'day') renderDay();else if (state.view === 'week') renderWeek();else renderMonth();
  }

  function buildBar(scope, titleText) {
    var bar = document.createElement('div');
    bar.className = 'p-weekbar p-bar--stack';
    bar.setAttribute('data-scope', scope);
    bar.innerHTML = '<button class="p-weekbar__btn" data-nav="prev"  aria-label="הקודם">‹</button>' + '<button class="p-weekbar__btn" data-nav="today">היום</button>' + '<button class="p-weekbar__btn" data-nav="next"  aria-label="הבא">›</button>' + "<div class=\"p-weekbar__title\">".concat(titleText, "</div>");
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-nav]');
      if (!b) return;
      var k = b.getAttribute('data-nav');

      if (scope === 'day') {
        if (k === 'prev') state.current.setDate(state.current.getDate() - 1);else if (k === 'next') state.current.setDate(state.current.getDate() + 1);else state.current = new Date();
      } else if (scope === 'week') {
        if (k === 'prev') state.current.setDate(state.current.getDate() - 7);else if (k === 'next') state.current.setDate(state.current.getDate() + 7);else state.current = new Date();
      } else {
        /* month */
        if (k === 'prev') state.current = addMonths(startOfMonth(state.current), -1);else if (k === 'next') state.current = addMonths(startOfMonth(state.current), 1);else state.current = new Date();
      }

      render();
      persistPrefs();
    });
    return bar;
  }

  function renderDay() {
    plannerRoot.innerHTML = '';
    var d = state.current;
    var title = "".concat(pad2(d.getDate()), ".").concat(pad2(d.getMonth() + 1), " \u2014 ").concat(HEB_DAYS[d.getDay()]); // no year

    plannerRoot.appendChild(buildBar('day', title)); // ...rest of your Day list code stays EXACTLY as-is...

    var wrap = document.createElement('div');
    wrap.className = 'p-dayview';
    var ymd = dateKey(state.current);
    var items = state.tasks.filter(function (t) {
      return t.date === ymd;
    }).sort(function (a, b) {
      return (a.time || '').localeCompare(b.time || '');
    });

    if (!items.length) {
      var empty = document.createElement('div');
      empty.className = 'p-empty';
      empty.textContent = 'אין אירועים ליום זה.';
      wrap.appendChild(empty);
    } else {
      items.forEach(function (t) {
        var row = document.createElement('div');
        row.className = 'p-daytask';
        row.innerHTML = '<div class="p-daytask__actions">' + "<button class=\"p-ico p-ico--del\" title=\"\u05DE\u05D7\u05E7\"  data-del=\"".concat(t.id, "\"  aria-label=\"\u05DE\u05D7\u05E7\"></button>") + "<button class=\"p-ico p-ico--ok\"  title=\"\u05D1\u05D5\u05E6\u05E2\" data-done=\"".concat(t.id, "\" aria-label=\"\u05D1\u05D5\u05E6\u05E2\"></button>") + '</div>' + "<div class=\"p-daytask__time\">".concat(t.time || '', "</div>") + "<div class=\"p-daytask__text\">".concat(escapeHtml(t.title), "</div>");
        wrap.appendChild(row);
      });
    }

    plannerRoot.appendChild(wrap);
  }

  function renderWeek() {
    plannerRoot.innerHTML = '';
    plannerRoot.appendChild(buildBar('week', weekLabel(state.current, weekStart))); // ...your existing Week grid/list code unchanged...

    var wrap = document.createElement('div');
    wrap.className = 'p-week';
    var start = startOfWeek(state.current, weekStart);

    var _loop = function _loop(i) {
      var day = new Date(start);
      day.setDate(start.getDate() + i);
      var ymd = dateKey(day);
      var count = state.tasks.filter(function (t) {
        return t.date === ymd;
      }).length;
      var tone = pastelFor(count);
      var box = document.createElement('div');
      box.className = 'p-day' + (sameDay(day, new Date()) ? ' p-day--today' : '');
      box.dataset["goto"] = ymd;
      var head = document.createElement('div');
      head.className = 'p-day__head p-day__head--flex';
      head.innerHTML = "<span class=\"p-day__name\">".concat(HEB_DAYS[day.getDay()], "</span>") + "<span class=\"p-day__date\">".concat(pad2(day.getDate()), ".").concat(pad2(day.getMonth() + 1), "</span>") + "<button class=\"p-day__count\" data-open=\"".concat(ymd, "\" style=\"--tone:").concat(tone.fg, "; color:").concat(tone.fg, "\">").concat(count, "</button>");
      box.appendChild(head);

      if (state._openWeek === ymd) {
        var items = state.tasks.filter(function (t) {
          return t.date === ymd;
        }).sort(function (a, b) {
          return (a.time || '').localeCompare(b.time || '');
        });
        var list = document.createElement('div');
        list.className = 'p-day__list';
        if (!items.length) list.innerHTML = '<div class="p-empty small">אין אירועים</div>';else {
          items.forEach(function (t) {
            var row = document.createElement('div');
            row.className = 'p-task';
            row.innerHTML = '<div class="p-task__actions">' + "<button class=\"p-ico p-ico--del\" title=\"\u05DE\u05D7\u05E7\"  data-del=\"".concat(t.id, "\"  aria-label=\"\u05DE\u05D7\u05E7\"></button>") + "<button class=\"p-ico p-ico--ok\"  title=\"\u05D1\u05D5\u05E6\u05E2\" data-done=\"".concat(t.id, "\" aria-label=\"\u05D1\u05D5\u05E6\u05E2\"></button>") + '</div>' + "<div class=\"p-task__time\">".concat(t.time || '', "</div>") + "<div class=\"p-task__text\">".concat(escapeHtml(t.title), "</div>");
            list.appendChild(row);
          });
        }
        box.appendChild(list);
      }

      wrap.appendChild(box);
    };

    for (var i = 0; i < 7; i++) {
      _loop(i);
    }

    plannerRoot.appendChild(wrap);
  }

  function renderMonth() {
    plannerRoot.innerHTML = '';
    var title = "".concat(HEB_MONTHS[state.current.getMonth()], " ").concat(state.current.getFullYear());
    plannerRoot.appendChild(buildBar('month', title)); // ...your existing Month grid code unchanged...

    var grid = document.createElement('div');
    grid.className = 'p-month';
    var anchor = new Date(state.current.getFullYear(), state.current.getMonth(), 1);
    var firstDow = (anchor.getDay() - weekStart + 7) % 7;
    var start = new Date(anchor);
    start.setDate(anchor.getDate() - firstDow);
    var now = new Date();

    var _loop2 = function _loop2(i) {
      var day = new Date(start);
      day.setDate(start.getDate() + i);
      var ymd = dateKey(day);
      var count = state.tasks.filter(function (t) {
        return t.date === ymd;
      }).length;
      var tone = pastelFor(count);
      var cell = document.createElement('div');
      var cls = 'p-cell';
      if (day.getMonth() !== state.current.getMonth()) cls += ' p-cell--pad';
      if (sameDay(day, now)) cls += ' p-cell--today';
      cell.className = cls;
      cell.dataset["goto"] = ymd;
      cell.style.setProperty('--ring-color', tone.fg);
      var num = document.createElement('div');
      num.className = 'p-cell__num';
      num.textContent = day.getDate();

      if (count > 0) {
        var b = document.createElement('span');
        b.className = 'p-count';
        b.textContent = count;
        b.style.setProperty('--tone', tone.fg);
        b.style.color = tone.fg;
        cell.appendChild(b);
      }

      cell.appendChild(num);
      grid.appendChild(cell);
    };

    for (var i = 0; i < 42; i++) {
      _loop2(i);
    }

    plannerRoot.appendChild(grid);
    var touchX = 0,
        swiping = false;
    grid.addEventListener('touchstart', function (e) {
      if (e.touches[0]) {
        touchX = e.touches[0].clientX;
        swiping = true;
      }
    }, {
      passive: true
    });
    grid.addEventListener('touchend', function (e) {
      if (!swiping) return;
      var dx = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX - touchX : 0;

      if (Math.abs(dx) > 40) {
        state.current = addMonths(startOfMonth(state.current), dx < 0 ? 1 : -1);
        render();
      }

      swiping = false;
    }, {
      passive: true
    });
  }
  /* ===================== Interactions ===================== */


  btnDay && btnDay.addEventListener('click', function () {
    state.view = 'day';
    render();
    prefs.defaultView = 'day';
    persistPrefs();
  });
  btnWeek && btnWeek.addEventListener('click', function () {
    state.view = 'week';
    render();
    prefs.defaultView = 'week';
    persistPrefs();
  });
  btnMonth && btnMonth.addEventListener('click', function () {
    state.view = 'month';
    render();
    prefs.defaultView = 'month';
    persistPrefs();
  }); // NEW: hook the static create-orb button to open the sheet

  if (createOrbBtn) {
    // Hook the static create-orb button to open the *composer*
    if (createOrbBtn) {
      createOrbBtn.addEventListener('click', function (e) {
        e.preventDefault();
        openComposer();
      });
    }
  }

  if (plannerRoot) {
    plannerRoot.addEventListener('click', function (e) {
      var openBtn = e.target && e.target.closest('[data-open]');

      if (openBtn) {
        var dayKey = openBtn.getAttribute('data-open');
        state._openWeek = state._openWeek === dayKey ? null : dayKey;
        render();
        return;
      }

      var hostGoto = e.target && e.target.closest('[data-goto]');

      if (hostGoto && !e.target.closest('[data-open]')) {
        state.current = fromKey(hostGoto.dataset["goto"]);
        state.view = 'day';
        render();
        return;
      }

      var doneId = e.target && e.target.getAttribute('data-done');
      var delId = e.target && e.target.getAttribute('data-del');

      function bumpStat(kind) {
        try {
          var k = 'loozStats';
          var o = JSON.parse(localStorage.getItem(k) || '{"doneTotal":0,"removedTotal":0}');
          if (kind === 'done') o.doneTotal = (o.doneTotal || 0) + 1;
          if (kind === 'removed') o.removedTotal = (o.removedTotal || 0) + 1;
          localStorage.setItem(k, JSON.stringify(o));
        } catch (_) {}
      }

      if (doneId) {
        bumpStat('done');
        blastConfetti(e.clientX || 0, e.clientY || 0, 1.0);
        state.tasks = state.tasks.filter(function (t) {
          return t.id !== doneId;
        });
        saveTasks();
        render();
      } else if (delId) {
        bumpStat('removed');
        var row = e.target.closest('.p-task,.p-daytask');

        if (row) {
          row.classList.add('is-scratching');
          setTimeout(function () {
            state.tasks = state.tasks.filter(function (t) {
              return t.id !== delId;
            });
            saveTasks();
            render();
          }, 520);
        } else {
          state.tasks = state.tasks.filter(function (t) {
            return t.id !== delId;
          });
          saveTasks();
          render();
        }
      }
    });
  }
  /* ===================== Bottom Sheet ===================== */


  function openSheet() {
    if (!sheet) return;
    var now = new Date();
    if (dateInput && !dateInput.value) dateInput.value = dateKey(now);
    if (timeInput && !timeInput.value) timeInput.value = "".concat(pad2(now.getHours()), ":").concat(pad2(now.getMinutes()));
    sheet.classList.remove('u-hidden');
    sheet.classList.add('is-open');

    try {
      titleInput && titleInput.focus();
    } catch (_unused7) {}
  }

  function closeSheet() {
    if (!sheet) return;
    sheet.classList.remove('is-open');
    setTimeout(function () {
      return sheet.classList.add('u-hidden');
    }, 220);
  }

  if (sheet) {
    sheetClose && sheetClose.addEventListener('click', function (e) {
      e.preventDefault();
      closeSheet();
    });
    sheetPanel && sheetPanel.addEventListener('click', function (e) {
      var qd = e.target && e.target.closest('.qp__chip[data-date]');

      if (qd) {
        e.preventDefault();
        var kind = qd.getAttribute('data-date');
        var base = new Date();
        if (kind === 'tomorrow') base.setDate(base.getDate() + 1);else if (kind === 'nextweek') base.setDate(base.getDate() + 7);else if (/^\+\d+$/.test(kind)) base.setDate(base.getDate() + parseInt(kind.slice(1), 10));
        if (dateInput) dateInput.value = dateKey(base);
        return;
      }

      var qt = e.target && e.target.closest('.qp__chip[data-time]');

      if (qt) {
        e.preventDefault();
        var k = qt.getAttribute('data-time');
        var now = new Date();

        if (/^now\+\d+$/.test(k)) {
          var m = parseInt(k.split('+')[1], 10) || 0;
          now.setMinutes(now.getMinutes() + m);
          timeInput && (timeInput.value = "".concat(pad2(now.getHours()), ":").concat(pad2(now.getMinutes())));
        } else if (/^\d{2}:\d{2}$/.test(k)) {
          timeInput && (timeInput.value = k);
        }
      }
    });
    sheet.addEventListener('click', function (e) {
      if (e.target && e.target.matches('.c-sheet__backdrop')) closeSheet();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSheet();
  });
  sheetForm && sheetForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = (titleInput && titleInput.value || '').trim();
    var d = (dateInput && dateInput.value || '').trim();
    var h = (timeInput && timeInput.value || '').trim();
    if (!t || !d || !h) return;
    var id = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    state.tasks.push({
      id: id,
      title: t,
      date: d,
      time: h
    });
    saveTasks();
    state.current = fromKey(d);
    state.view = 'day';
    render();
    sheetForm.reset();
    closeSheet();
  });
  /* ===================== Logout helpers (kept) ===================== */

  function clearAuthAll() {
    try {
      ['authUser', 'authName', 'token', 'auth.token', 'auth.user', 'looz:justLoggedIn', 'looz:loggedOut'].forEach(function (k) {
        try {
          localStorage.removeItem(k);
        } catch (_unused8) {}

        try {
          sessionStorage.removeItem(k);
        } catch (_unused9) {}
      });
    } catch (_unused10) {}
  }

  function handleLogout() {
    window.__loozLoggingOut = true;
    clearAuthAll();

    try {
      localStorage.setItem('looz:loggedOut', '1');
    } catch (_unused11) {}

    window.location.replace('auth.html?loggedout=1');
  }
  /* ===================== Fullscreen Composer (new) ===================== */


  var composer = document.getElementById('eventComposer');
  var compPanel = composer ? composer.querySelector('.composer__panel') : null;
  var compCloseBtns = composer ? composer.querySelectorAll('[data-close]') : [];
  var compForm = document.getElementById('composerForm');
  var compTitle = document.getElementById('compTitle');
  var compDate = document.getElementById('compDate');
  var compTime = document.getElementById('compTime');
  var compMic = document.getElementById('compMic');
  var compMicNote = document.getElementById('compMicNote');

  function openComposer() {
    if (!composer) return;
    var now = new Date();
    if (compDate && !compDate.value) compDate.value = dateKey(now);
    if (compTime && !compTime.value) compTime.value = "".concat(pad2(now.getHours()), ":").concat(pad2(now.getMinutes()));
    composer.classList.remove('u-hidden');
    composer.classList.add('is-open');
    composer.setAttribute('aria-hidden', 'false');

    try {
      compTitle && compTitle.focus();
    } catch (_unused12) {}
  }

  function closeComposer() {
    if (!composer) return;
    composer.classList.remove('is-open');
    composer.setAttribute('aria-hidden', 'true');
    setTimeout(function () {
      return composer.classList.add('u-hidden');
    }, 220);
    stopMic();
  }

  compCloseBtns.forEach(function (btn) {
    return btn.addEventListener('click', function (e) {
      e.preventDefault();
      closeComposer();
    });
  });
  composer && composer.addEventListener('click', function (e) {
    if (e.target && e.target.classList.contains('composer__backdrop')) closeComposer();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && composer && composer.classList.contains('is-open')) closeComposer();
  });
  /* ---- Save ---- */

  compForm && compForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = (compTitle && compTitle.value || '').trim();
    var d = (compDate && compDate.value || '').trim();
    var h = (compTime && compTime.value || '').trim();
    if (!t || !d || !h) return;
    var idv = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    state.tasks.push({
      id: idv,
      title: t,
      date: d,
      time: h
    });
    saveTasks();
    state.current = fromKey(d);
    state.view = 'day';
    render();
    compForm.reset();
    closeComposer();
  });
  /* ---- Voice to text (Web Speech API) ---- */

  var _rec = null;
  var _listening = false;

  function ensureRecognizer() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    if (_rec) return _rec;
    var r = new SR();
    r.lang = 'he-IL'; // Hebrew first (change to 'en-US' if you prefer)

    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;

    r.onresult = function (evt) {
      var txt = '';

      for (var i = evt.resultIndex; i < evt.results.length; i++) {
        txt += evt.results[i][0].transcript;
      }

      if (compTitle) compTitle.value = txt.trim();
      if (compMicNote) compMicNote.textContent = 'מזהה דיבור...';
    };

    r.onerror = function () {
      if (compMicNote) compMicNote.textContent = 'שגיאת מיקרופון.';
      stopMic(true);
    };

    r.onend = function () {
      stopMic();
    };

    _rec = r;
    return r;
  }

  function startMic() {
    var r = ensureRecognizer();

    if (!r) {
      if (compMicNote) compMicNote.textContent = 'הדפדפן לא תומך בזיהוי דיבור.';
      return;
    }

    if (_listening) return;
    _listening = true;
    compMic && compMic.setAttribute('aria-pressed', 'true');
    compMic && compMic.classList.add('is-on');
    if (compMicNote) compMicNote.textContent = 'התחל/י לדבר...';

    try {
      r.start();
    } catch (_unused13) {}
  }

  function stopMic(forceNote) {
    if (!_listening) return;
    _listening = false;
    compMic && compMic.setAttribute('aria-pressed', 'false');
    compMic && compMic.classList.remove('is-on');

    try {
      _rec && _rec.stop();
    } catch (_unused14) {}

    if (compMicNote) compMicNote.textContent = forceNote ? compMicNote.textContent || '' : '';
  }

  compMic && compMic.addEventListener('click', function (e) {
    e.preventDefault();
    _listening ? stopMic(true) : startMic();
  });
  /* ===================== Effects & INLINE CSS (minimal) ===================== */

  function blastConfetti(x, y, scale) {
    var layer = document.createElement('div');
    layer.className = 'fx-confetti';
    document.body.appendChild(layer);
    var N = 110;

    for (var i = 0; i < N; i++) {
      var s = document.createElement('span');
      s.className = 'fx-c';
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.setProperty('--dx', (Math.random() * 2 - 1) * 200 * scale + 'px');
      s.style.setProperty('--dy', -Math.random() * 240 * scale + 'px');
      s.style.setProperty('--r', Math.random() * 720 + 'deg');
      s.style.setProperty('--t', 600 + Math.random() * 700 + 'ms');
      layer.appendChild(s);
    }

    setTimeout(function () {
      return layer.remove();
    }, 1600);
  } // Update injected style (kept lean; adds single-line titles)


  var prev = document.getElementById('looz-fixes-v12');
  if (prev) prev.remove();
  var style = document.createElement('style');
  style.id = 'looz-fixes-v12';
  style.textContent = "\n    .p-weekbar__title,.p-monthbar__title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n  ";
  document.head.appendChild(style);
  /* ===================== Initial ===================== */

  var _today = new Date();

  state.current = _today;
  formatTitle(_today);
  render();
  /* ---- Save ---- */

  compForm && compForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = (compTitle && compTitle.value || '').trim();
    var d = (compDate && compDate.value || '').trim();
    var h = (compTime && compTime.value || '').trim();
    if (!t || !d || !h) return;
    var idv = 't_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    state.tasks.push({
      id: idv,
      title: t,
      date: d,
      time: h
    });
    saveTasks();
    state.current = fromKey(d);
    state.view = 'day';
    render();
    var primary = document.querySelector('#eventComposer .c-btn--primary');

    if (primary) {
      primary.classList.add('is-rippling');
      setTimeout(function () {
        return primary.classList.remove('is-rippling');
      }, 480);
    }

    celebrateSave(); // ← add this line

    compForm.reset();
    closeComposer();
  });
})();
/* --- AUTH GUARD (skip on auth page) --- */


(function () {
  try {
    if (/auth\.html(?:$|\?)/.test(location.pathname)) return;
    var u = localStorage.getItem('authUser') || localStorage.getItem('auth.user');
    if (!u) location.replace('auth.html');
  } catch (_) {
    location.replace('auth.html');
  }
})();