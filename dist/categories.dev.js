"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

(function () {
  var form = document.getElementById('catForm');
  var summary = document.getElementById('catSummary');
  var clearBtn = document.getElementById('clearCats');
  var tagsBar = document.getElementById('pickedTags');
  var results = document.getElementById('results'); // Quick pills (no-op demo toggles; you can wire them to real logic later)

  document.querySelectorAll('.pill').forEach(function (p) {
    p.addEventListener('click', function () {
      return p.classList.toggle('is-on');
    });
  }); // Demo activities (swap with backend later)

  var ACTIVITIES = [{
    id: 'ride-yafo',
    title: 'רכיבת שקיעה בטיילת יפו',
    img: 'assets/demo/yafo.jpg',
    facets: {
      timeOfDay: ['ערב'],
      location: ['בחוץ', 'בעיר'],
      mood: ['ספורטיבי', 'רומנטי'],
      weather: ['שמשי', 'מעונן'],
      people: ['זוג', 'חברים'],
      season: ['קיץ', 'אביב']
    },
    meta: 'זמן: 1–2 ש׳ · תקציב: חינם · מקום: תל-אביב'
  }, {
    id: 'museum',
    title: 'מוזיאון ואספרסו',
    img: 'assets/demo/museum.jpg',
    facets: {
      timeOfDay: ['בוקר', 'צהריים'],
      location: ['בעיר', 'בבית', 'בפנים'],
      mood: ['תרבותי', 'רגוע'],
      weather: ['גשום', 'קריר', 'מעונן'],
      people: ['לבד', 'זוג', 'חברים']
    },
    meta: 'זמן: 1–3 ש׳ · תקציב: ₪ · מקום: קרוב אליך'
  }, {
    id: 'wadi',
    title: 'נחל קצר עם פיקניק',
    img: 'assets/demo/wadi.jpg',
    facets: {
      timeOfDay: ['אחה״צ', 'בוקר'],
      location: ['בטבע'],
      mood: ['טבע', 'חברתי'],
      weather: ['שמשי'],
      people: ['משפחה', 'חברים', 'קבוצה']
    },
    meta: 'זמן: 2–4 ש׳ · תקציב: נמוך · איזור ההר'
  }]; // Equal-height selectable chips

  form.querySelectorAll('.chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      chip.classList.toggle('is-on');
      renderTags();
      updateSummary();
    });
  });
  clearBtn.addEventListener('click', function () {
    form.querySelectorAll('.chip.is-on').forEach(function (c) {
      return c.classList.remove('is-on');
    });
    renderTags();
    updateSummary();
    results.innerHTML = '';
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault(); // skeletons

    results.innerHTML = "\n      <div class=\"r-card\"><div class=\"r-img skel\"></div><div class=\"skel\" style=\"height:20px;border-radius:10px\"></div></div>\n      <div class=\"r-card\"><div class=\"r-img skel\"></div><div class=\"skel\" style=\"height:20px;border-radius:10px\"></div></div>\n    ";
    var filters = getPayload(); // simulate fetch

    setTimeout(function () {
      var list = filterActivities(ACTIVITIES, filters);
      renderResults(list);
    }, 400);
  });

  function getPayload() {
    var payload = {};
    form.querySelectorAll('.chips').forEach(function (wrap) {
      var group = wrap.dataset.group;

      var selected = _toConsumableArray(wrap.querySelectorAll('.chip.is-on')).map(function (b) {
        return b.dataset.key;
      });

      if (selected.length) payload[group] = selected;
    });
    return payload;
  }

  function updateSummary() {
    var count = form.querySelectorAll('.chip.is-on').length;
    summary.textContent = count ? "\u05E0\u05D1\u05D7\u05E8\u05D5 ".concat(count, " \u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D5\u05EA") : 'לא נבחרו קטגוריות';
  }

  function renderTags() {
    var payload = getPayload();
    var entries = Object.entries(payload).flatMap(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
          group = _ref2[0],
          vals = _ref2[1];

      return vals.map(function (v) {
        return {
          group: group,
          v: v
        };
      });
    });
    tagsBar.innerHTML = entries.map(function (_ref3) {
      var group = _ref3.group,
          v = _ref3.v;
      return "\n      <span class=\"tag\" data-group=\"".concat(group, "\" data-val=\"").concat(v, "\">\n        <span>").concat(v, "</span>\n        <button type=\"button\" aria-label=\"\u05D4\u05E1\u05E8 ").concat(v, "\" title=\"\u05D4\u05E1\u05E8\">\n          <svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" aria-hidden=\"true\">\n            <path d=\"M18 6L6 18M6 6l12 12\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n          </svg>\n        </button>\n      </span>\n    ");
    }).join(''); // X remove => also untoggle the source chip

    tagsBar.querySelectorAll('.tag button').forEach(function (btn) {
      btn.addEventListener('click', function (ev) {
        var tag = ev.currentTarget.closest('.tag');
        var _tag$dataset = tag.dataset,
            group = _tag$dataset.group,
            val = _tag$dataset.val;
        var chip = form.querySelector(".chips[data-group=\"".concat(group, "\"] .chip[data-key=\"").concat(CSS.escape(val), "\"]"));
        if (chip) chip.classList.remove('is-on');
        renderTags();
        updateSummary();
      });
    });
  }

  function overlap() {
    var a = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
    var b = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    var s = new Set(a);
    return b.some(function (x) {
      return s.has(x);
    });
  }

  function filterActivities(items, filters) {
    var keys = Object.keys(filters);
    if (!keys.length) return items;
    return items.filter(function (item) {
      return keys.every(function (k) {
        return overlap(filters[k], item.facets[k] || []);
      });
    });
  }

  function renderResults(list) {
    if (!list.length) {
      results.innerHTML = "<p class=\"cat__summary\">\u05D0\u05D9\u05DF \u05EA\u05D5\u05E6\u05D0\u05D5\u05EA \u05EA\u05D5\u05D0\u05DE\u05D5\u05EA \u2014 \u05E0\u05E1\u05D5 \u05DC\u05D4\u05E1\u05D9\u05E8 \u05DB\u05DE\u05D4 \u05DE\u05E1\u05E0\u05E0\u05D9\u05DD.</p>";
      return;
    }

    results.innerHTML = list.map(function (x) {
      return "\n      <article class=\"r-card\">\n        <img class=\"r-img\" src=\"".concat(x.img, "\" alt=\"\">\n        <div>\n          <h4 class=\"r-title\">").concat(x.title, "</h4>\n          <p class=\"r-meta\">").concat(x.meta, "</p>\n          <div class=\"r-actions\">\n            <button class=\"r-btn r-btn--primary\" data-id=\"").concat(x.id, "\">\u05E4\u05EA\u05D7</button>\n            <button class=\"r-btn r-btn--ghost\" data-id=\"").concat(x.id, "\" data-save=\"1\">\u05E9\u05DE\u05D5\u05E8</button>\n          </div>\n        </div>\n      </article>\n    ");
    }).join('');
  } // init


  renderTags();
  updateSummary();
})();