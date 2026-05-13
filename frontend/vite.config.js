import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Serve admin MPA entry at http://localhost:5173/admin/... (rewrite to admin.html). */
function adminSpaDevRewrite() {
  return {
    name: 'admin-spa-dev-rewrite',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const raw = req.url || '';
        const pathname = raw.split('?')[0];
        if (pathname !== '/admin' && !pathname.startsWith('/admin/')) {
          next();
          return;
        }
        const q = raw.includes('?') ? raw.slice(raw.indexOf('?')) : '';
        req.url = `/admin.html${q}`;
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), adminSpaDevRewrite()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin.html')
      }
    }
  }
});


