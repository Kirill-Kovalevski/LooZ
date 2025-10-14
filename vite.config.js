import { defineConfig } from 'vite';

export default defineConfig({
  base: '/LooZ/',            // <-- hardcode to be safe
  server: { port: 5173, open: true }
});
