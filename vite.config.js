import { defineConfig } from 'vite';

// If deploying to https://<user>.github.io/<repo>/ set base to '/<repo>/'
const base = process.env.GH_PAGES ? '/LooZ/' : '/';

export default defineConfig({
  base,
  server: { port: 5173, open: true }
});
