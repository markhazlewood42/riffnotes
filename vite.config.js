import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
const VALID_FN_NAME = /^[a-z0-9-_]+$/i;

// Dev middleware that loads Vercel serverless functions from api/ directory
function vercelApiMiddleware() {
  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      // Load all env vars (not just VITE_*) for serverless functions
      const env = loadEnv(server.config.mode, process.cwd(), '');
      Object.assign(process.env, env);
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next();

        const fnName = req.url.split('?')[0].replace('/api/', '');
        if (!VALID_FN_NAME.test(fnName)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
          return;
        }
        try {
          // Use Vite's SSR module loader for proper HMR and no module cache leak
          const mod = await server.ssrLoadModule(`/api/${fnName}.js`);
          const handler = mod.default;

          // Parse query params
          const url = new URL(req.url, 'http://localhost');
          const query = Object.fromEntries(url.searchParams);

          // Minimal req/res adapter for Vercel-style handlers
          const fakeReq = { method: req.method, query };
          const fakeRes = {
            statusCode: 200,
            status(code) {
              this.statusCode = code;
              return this;
            },
            json(data) {
              res.writeHead(this.statusCode, {
                'Content-Type': 'application/json',
              });
              res.end(JSON.stringify(data));
            },
          };

          await handler(fakeReq, fakeRes);
        } catch (err) {
          console.error(`API error (${fnName}):`, err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), vercelApiMiddleware()],
  server: {
    port: 3000,
    watch: {
      usePolling: true,
    },
  },
});
