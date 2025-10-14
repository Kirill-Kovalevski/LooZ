const routes = {
  '': 'home',
  '#/home': 'home',
  '#/day': 'day',
  '#/week': 'week',
  '#/month': 'month',
  '#/settings': 'settings',
};

export function initRouter() {
  const app = document.getElementById('app');

  async function render() {
    const key = routes[location.hash] ?? 'home';
    document.body.setAttribute('data-view', key);
    const mod = await import(`./pages/${key}.js`);
    app.innerHTML = '';
    mod.mount?.(app);
  }

  window.addEventListener('hashchange', render);
  render();
}
