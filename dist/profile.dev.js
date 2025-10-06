"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

(function () {
  'use strict';
  /* ===== helpers ===== */

  var $ = function $(sel) {
    var root = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : document;
    return root.querySelector(sel);
  };

  var $id = function $id(id) {
    return document.getElementById(id);
  };

  var num = function num(k) {
    var d = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var n = parseInt(localStorage.getItem(k) || '', 10);
    return Number.isFinite(n) ? n : d;
  };

  var setNum = function setNum(k, v) {
    return localStorage.setItem(k, String(Math.max(0, v | 0)));
  };
  /* ===== auth/profile data (from your app) ===== */


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

  var prof = getProfile();
  var auth = getAuth() || {};
  var name = prof.firstName || prof.name || auth.firstName || auth.name || 'דניאלה';
  var handle = auth.email ? '@' + auth.email.split('@')[0] : prof.handle || '@user';
  if ($id('prName')) $id('prName').textContent = name;
  if ($id('prHandle')) $id('prHandle').textContent = handle;

  if (prof.city || prof.country) {
    var locEl = $('#prLocation span');
    if (locEl) locEl.textContent = (prof.city || '') + (prof.country ? ', ' + prof.country : '');
  }
  /* ===== Cover (background) upload ===== */


  var coverBtn = $id('prCoverBtn');
  var coverFile = $id('prCoverFile');

  function setCover(dataUrl) {
    if (!coverBtn) return;
    coverBtn.style.backgroundImage = "url(\"".concat(dataUrl, "\")");
    coverBtn.style.backgroundSize = 'cover';
    coverBtn.style.backgroundPosition = 'center';
  }

  (function loadCover() {
    var saved = localStorage.getItem('profileCover');
    if (saved) setCover(saved);
  })();

  if (coverBtn && coverFile) {
    coverBtn.addEventListener('click', function () {
      return coverFile.click();
    });
    coverFile.addEventListener('change', function () {
      var f = coverFile.files && coverFile.files[0];
      if (!f) return;
      var rd = new FileReader();

      rd.onload = function (e) {
        var dataUrl = e.target.result;
        setCover(dataUrl);
        localStorage.setItem('profileCover', dataUrl);
      };

      rd.readAsDataURL(f);
    });
  }
  /* ===== Avatar upload ===== */


  var avatarBtn = $id('prAvatarBtn');
  var avatarImg = $id('prAvatar');
  var avatarFile = $id('prAvatarFile');

  function setAvatar(dataUrl) {
    if (avatarImg) avatarImg.style.backgroundImage = "url(\"".concat(dataUrl, "\")");
  }

  (function loadAvatar() {
    var saved = localStorage.getItem('profileAvatar');
    if (saved) setAvatar(saved);
  })();

  if (avatarBtn && avatarFile) {
    avatarBtn.addEventListener('click', function () {
      return avatarFile.click();
    });
    avatarFile.addEventListener('change', function () {
      var f = avatarFile.files && avatarFile.files[0];
      if (!f) return;
      var rd = new FileReader();

      rd.onload = function (e) {
        var dataUrl = e.target.result;
        setAvatar(dataUrl);
        localStorage.setItem('profileAvatar', dataUrl);
      };

      rd.readAsDataURL(f);
    });
  }
  /* ===== Social: follow/followers/etc ===== */


  var KEY_FOLLOWED = 'looz:isFollowing';
  var KEY_FOLLOWERS = 'looz:followers';
  var KEY_FOLLOWING = 'looz:following';
  var KEY_SUBSCRIBES = 'looz:subscribers';
  var KEY_POSTS = 'looz:posts';
  if (localStorage.getItem(KEY_FOLLOWERS) == null) setNum(KEY_FOLLOWERS, 9);
  if (localStorage.getItem(KEY_FOLLOWING) == null) setNum(KEY_FOLLOWING, 1);
  if (localStorage.getItem(KEY_SUBSCRIBES) == null) setNum(KEY_SUBSCRIBES, 0);
  if (localStorage.getItem(KEY_POSTS) == null) setNum(KEY_POSTS, 3);

  function renderSocial() {
    var f = $id('stFollowers');
    if (f) f.textContent = num(KEY_FOLLOWERS);
    var g = $id('stFollowing');
    if (g) g.textContent = num(KEY_FOLLOWING);
    var s = $id('stSubscribers');
    if (s) s.textContent = num(KEY_SUBSCRIBES);
    var p = $id('stPosts');
    if (p) p.textContent = num(KEY_POSTS);
  }

  renderSocial();
  var btnFollow = $id('btnFollow');

  function setFollowUI(on) {
    if (!btnFollow) return;
    btnFollow.textContent = on ? 'עוקבים ✓' : 'עקוב';
    btnFollow.classList.toggle('pr-btn--primary', !on);
    btnFollow.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  var isFollowing = localStorage.getItem(KEY_FOLLOWED) === '1';
  setFollowUI(isFollowing);

  if (btnFollow) {
    btnFollow.addEventListener('click', function () {
      isFollowing = !isFollowing;
      localStorage.setItem(KEY_FOLLOWED, isFollowing ? '1' : '0');
      setFollowUI(isFollowing);
      setNum(KEY_FOLLOWERS, num(KEY_FOLLOWERS) + (isFollowing ? 1 : -1));
      renderSocial();
    });
  }

  var btnMsg = $id('btnMessage');

  if (btnMsg) {
    btnMsg.addEventListener('click', function () {
      if (auth.email) {
        location.href = "mailto:".concat(auth.email, "?subject=").concat(encodeURIComponent('הודעה מהפרופיל שלך ב-LooZ'));
      } else {
        alert('הודעות ישירות — בקרוב ♥');
      }
    });
  }
  /* ===== Tasks & stats ===== */


  function loadEvents() {
    var raw = localStorage.getItem('events') || localStorage.getItem('loozEvents') || localStorage.getItem('plannerTasks') || '[]';

    try {
      return JSON.parse(raw) || [];
    } catch (_unused3) {
      return [];
    }
  }

  function completionsLastDays(events) {
    var days = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 14;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var arr = Array.from({
      length: days
    }, function () {
      return 0;
    });
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = events[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var ev = _step.value;
        if (!(ev.done || ev.completed)) continue;
        var d = new Date(ev.date || ev.day || ev.d || Date.now());
        d.setHours(0, 0, 0, 0);
        var diff = Math.round((today - d) / 86400000);
        if (diff >= 0 && diff < days) arr[days - 1 - diff]++;
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator["return"] != null) {
          _iterator["return"]();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    return arr;
  }

  function streakDays(events) {
    var has = new Set(events.filter(function (e) {
      return e.done || e.completed;
    }).map(function (e) {
      return String(e.date || e.day || e.d).slice(0, 10);
    }));
    var s = 0,
        d = new Date();
    d.setHours(0, 0, 0, 0);

    for (;;) {
      var key = d.toISOString().slice(0, 10);

      if (has.has(key)) {
        s++;
        d.setDate(d.getDate() - 1);
      } else break;
    }

    return s;
  }

  function buildTaskStats() {
    var evs = loadEvents();
    var open = [];
    var done = [];
    var days = new Set();
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = evs[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var ev = _step2.value;
        var isDone = !!(ev.done || ev.completed);
        (isDone ? done : open).push(ev);
        var d = ev.date || ev.day || ev.d;
        if (d) days.add(String(d).slice(0, 10));
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
          _iterator2["return"]();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    if ($id('stOpen')) $id('stOpen').textContent = open.length;
    if ($id('stDone')) $id('stDone').textContent = done.length;
    if ($id('stTotal')) $id('stTotal').textContent = evs.length;
    if ($id('stActiveDays')) $id('stActiveDays').textContent = days.size;
    drawChart(completionsLastDays(evs, 14));
    renderBadges({
      done: done.length,
      days: days.size,
      streak: streakDays(evs)
    });
  }
  /* ===== Chart (responsive + DPR) ===== */


  var canvas = $id('prChart');
  var ctx = canvas ? canvas.getContext('2d') : null;
  var DPR = 1;

  function fitCanvas() {
    if (!canvas || !ctx) return;
    var box = canvas.parentElement.getBoundingClientRect();
    DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2)); // חד בלי להכביד

    canvas.style.width = Math.round(box.width) + 'px';
    canvas.style.height = '220px';
    canvas.width = Math.round(box.width * DPR);
    canvas.height = Math.round(220 * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // מציירים ביחידות CSS-פיזיות
  }

  function drawChart(values) {
    if (!canvas || !ctx) return;
    fitCanvas();
    var W = canvas.width / DPR;
    var H = canvas.height / DPR;
    var pad = 22;
    ctx.clearRect(0, 0, W, H);
    var lineCol = getComputedStyle(document.documentElement).getPropertyValue('--line') || '#cbd5e1';
    ctx.strokeStyle = lineCol.trim();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, H - pad);
    ctx.lineTo(W - pad, H - pad);
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, H - pad);
    ctx.stroke();
    var max = Math.max.apply(Math, [1].concat(_toConsumableArray(values)));
    var stepX = (W - pad * 2) / (values.length - 1);
    ctx.beginPath();

    for (var i = 0; i < values.length; i++) {
      var x = pad + i * stepX;
      var y = H - pad - values[i] / max * (H - pad * 2);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#2563eb';
    ctx.stroke();
    var grad = ctx.createLinearGradient(0, pad, 0, H - pad);
    grad.addColorStop(0, 'rgba(37,99,235,.25)');
    grad.addColorStop(1, 'rgba(37,99,235,0)');
    ctx.lineTo(W - pad, H - pad);
    ctx.lineTo(pad, H - pad);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.fillStyle = 'rgba(15,23,42,.08)';

    for (var _i = 0; _i < values.length; _i++) {
      var _x = pad + _i * stepX;

      ctx.fillRect(_x - 1, H - pad - 4, 2, 4);
    }
  }
  /* ===== Achievements ===== */


  function renderBadges(_ref) {
    var done = _ref.done,
        days = _ref.days,
        streak = _ref.streak;
    var list = $id('prBadges');
    if (!list) return;
    list.innerHTML = '';
    var items = [];
    if (streak >= 3) items.push({
      icon: '🔥',
      label: "\u05E8\u05E6\u05E3 ".concat(streak, " \u05D9\u05DE\u05D9\u05DD")
    });
    if (done >= 10) items.push({
      icon: '🏅',
      label: '10 משימות הושלמו'
    });
    if (done >= 25) items.push({
      icon: '🥈',
      label: '25 משימות הושלמו'
    });
    if (done >= 50) items.push({
      icon: '🥇',
      label: '50 משימות הושלמו'
    });
    if (days >= 7) items.push({
      icon: '📆',
      label: 'שבוע פעיל'
    });
    if (!items.length) items.push({
      icon: '✨',
      label: 'בדרך להישג הראשון!'
    });

    for (var _i2 = 0, _items = items; _i2 < _items.length; _i2++) {
      var b = _items[_i2];
      var li = document.createElement('li');
      li.innerHTML = "<div class=\"badge__icon\" aria-hidden=\"true\">".concat(b.icon, "</div><div class=\"badge__txt\">").concat(b.label, "</div>");
      list.appendChild(li);
    }
  }
  /* ===== init ===== */


  window.addEventListener('resize', function () {
    return drawChart(completionsLastDays(loadEvents(), 14));
  });
  buildTaskStats();
})();