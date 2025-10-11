
(() => {
  const KEY = 'looz:isDark';
  const root = document.documentElement;

  // --- helpers ---
  const truthy = v => v === true || v === '1' || v === 1 || v === 'true' || v === 'dark';
  const getStored = () => {
    const v = localStorage.getItem(KEY);
    return v == null ? null : truthy(v);
  };
  const apply = on => {
    root.classList.toggle('is-dark', !!on);
    if (document.body) document.body.classList.toggle('is-dark', !!on);
    root.style.colorScheme = on ? 'dark' : 'light';
    // broadcast (both spellings for back-compat)
    const detail = { detail: { dark: !!on } };
    try {
      window.dispatchEvent(new CustomEvent('looz:theme', detail));
      window.dispatchEvent(new CustomEvent('looz-theme', detail));
    } catch(_) {}
  };

  // --- init (no flash) ---
  const stored = getStored();
  const prefers = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  apply(stored == null ? prefers : stored);

  // --- public API for pages/buttons ---
  function isDark(){ return root.classList.contains('is-dark'); }
  function set(mode){ const on = truthy(mode); localStorage.setItem(KEY, on ? '1':'0'); apply(on); }
  function toggle(){ set(!isDark()); }

  window.__loozTheme = { isDark, set, toggle, onChange(cb){ window.addEventListener('looz:theme', e => cb(!!(e.detail&&e.detail.dark))); } };

  // --- sync page checkboxes if present ---
  function syncToggles(){
    ['pDark','setDark'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = isDark();
    });
  }
  document.addEventListener('DOMContentLoaded', () => {
    ['pDark','setDark'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el._loozBound){
        el._loozBound = true;
        el.addEventListener('change', () => set(el.checked ? 'dark' : 'light'));
      }
    });
    // ensure <body> picks the class once it exists
    apply(isDark());
    syncToggles();
  });
// js/theme.js
(function () {
  const KEY = "loozTheme"; // 'light' | 'dark' | 'system'
  const root = document.documentElement;
  const mq = window.matchMedia("(prefers-color-scheme: dark)");

  function apply(theme) {
    const mode = theme === "system" ? (mq.matches ? "dark" : "light") : theme;
    root.setAttribute("data-theme", mode);
    root.style.colorScheme = mode; // form controls, etc.
  }

  function load() {
    return localStorage.getItem(KEY) || "system";
  }

  function save(theme) {
    localStorage.setItem(KEY, theme);
  }

  // react to system changes only if in "system" mode
  mq.addEventListener("change", () => {
    if (load() === "system") apply("system");
  });

  // optional header toggle (cycles: system → dark → light → system)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#themeToggle");
    if (!btn) return;
    const curr = load();
    const next = curr === "system" ? "dark" : curr === "dark" ? "light" : "system";
    save(next);
    apply(next);
    btn.setAttribute("aria-label", `מצב צבע: ${next}`);
  });

  // boot
  apply(load());
})();


  window.addEventListener('looz:theme', syncToggles);
  
})();