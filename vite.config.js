import { defineConfig } from 'vite';

const base = process.env.GH_PAGES ? '/LooZ/' : '/';

export default defineConfig({
  base,
  server: {
    port: 5173,
    open: true,
    proxy: {
      // browser calls: /api/weather?...   (same origin)
      // vite forwards: https://api.open-meteo.com/v1/forecast?...
      '/api/weather': {
        target: 'https://api.open-meteo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/weather/, '/v1/forecast'),
      },
    },
  },
});
