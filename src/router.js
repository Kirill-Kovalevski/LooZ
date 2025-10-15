// src/router.js
export function startRouter(app) {
  async function show(view) {
    const mod = await import(`./pages/${view}.js`);
    mod.mount(app);                     // <- each view mounts into #viewRoot
  }

  async function apply() {
    const h = location.hash.replace(/^#\/?/, '');
    if (h === 'day')  return show('day');
    if (h === 'week') return show('week');
    if (h === 'month')return show('month');
    // default: land on month (or day) but KEEP the shell
    return show('month');
  }

  window.addEventListener('hashchange', apply);
  apply();
}
