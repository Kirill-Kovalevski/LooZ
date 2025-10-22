// /src/router.js
export function startRouter(app) {
  async function show(view) {
    const mod = await import(`./pages/${view}.js`);
    mod.mount(app);
  }

  async function apply() {
    const h = (location.hash || '#/month').replace(/^#\/?/, '');

    switch (h) {
      case 'day':    return show('day');
      case 'week':   return show('week');
      case 'month':  return show('month');

      case 'categories': {
        const mod = await import('./pages/categories.js');
        (mod.mount || mod.renderCategories)(app);
        return;
      }

      case 'social': {
        const mod = await import('./pages/social.js');
        (mod.default?.mount || mod.mount)(app);
        return;
      }

      case 'settings': {
        const mod = await import('./pages/settings.js');
        (mod.default || mod.mount)();
        return;
      }

      case 'profile': {
        const mod = await import('./pages/profile.js');
        (mod.default?.mount || mod.mount || mod.default)();
        return;
      }

      default:
        return show('month');
    }
  }

  window.addEventListener('hashchange', apply);
  apply();
}
