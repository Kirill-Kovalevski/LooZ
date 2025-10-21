// src/router.js
export function startRouter(app) {
  async function show(view) {
    // day/week/month modules expose mount(app)
    const mod = await import(`./pages/${view}.js`);
    mod.mount(app);
  }

  async function apply() {
    const h = (location.hash || '#/month').replace(/^#\/?/, '');

    switch (h) {
      case 'day':    return show('day');
      case 'week':   return show('week');
      case 'month':  return show('month');

      // Categories is a full page that mounts into #viewRoot (same as other views)
      case 'categories': {
        const mod = await import('./pages/categories.js');
        (mod.mount || mod.renderCategories)(app);
        return;
      }

      default:
        return show('month');
    }
  }

  window.addEventListener('hashchange', apply);
  apply();
}
