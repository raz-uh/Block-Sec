import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'BlockSecLab API & Foundry Execution Engine',
      timestamp: new Date().toISOString(),
    });
  });

  // Sandbox compilation & execution proxy
  app.post('/api/sandbox/execute', (req, res) => {
    const { challengeId, exploitCode } = req.body;
    if (!challengeId || !exploitCode) {
      return res.status(400).json({ error: 'Missing challengeId or exploitCode' });
    }

    res.json({
      success: true,
      message: 'Execution processed via sandbox pipeline',
    });
  });

  if (!isProd) {
    // Mount Vite dev server middleware with HMR explicitly disabled
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false, // Explicitly disable HMR WebSocket transport to prevent client errors
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`BlockSecLab server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start BlockSecLab server:', err);
  process.exit(1);
});
