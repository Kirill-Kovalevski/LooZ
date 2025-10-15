import { defineConfig } from 'vite';

const base = process.env.GH_PAGES ? '/LooZ/' : '/';

export default defineConfig({
  base,
  server: { port: 5173, open: true }
});
