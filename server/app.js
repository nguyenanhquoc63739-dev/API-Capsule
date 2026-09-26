import express from 'express';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'node:url';
import { authRoutes, requireAuth } from './auth.js';
import { capsuleRoutes } from './capsules.js';

export function createApp(config, db, fetchGithub) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser(config.secret));
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('X-Frame-Options', 'DENY');
    if (req.path.startsWith('/api/') || req.path === '/dashboard') res.set('Cache-Control', 'no-store');
    if (['POST', 'PUT', 'DELETE'].includes(req.method) &&
      ((req.get('Origin') && req.get('Origin') !== config.appUrl) || req.get('Sec-Fetch-Site') === 'cross-site')) {
      return res.status(403).json({ error: 'Cross-site request rejected.' });
    }
    next();
  });
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes(config, fetchGithub));
  app.use('/api/capsules', capsuleRoutes(db, config.secret));
  app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));
  const clientDir = fileURLToPath(new URL('../client/dist', import.meta.url));
  app.get('/dashboard', requireAuth(config.secret, true));
  app.use(express.static(clientDir, { index: false }));
  app.get(['/', '/login', '/dashboard'], (req, res) => res.sendFile(`${clientDir}/index.html`));
  app.use((req, res) => res.status(404).send('Page not found.'));
  app.use((error, req, res, next) => {
    const status = error.status === 400 || error.status === 413 ? error.status : 500;
    res.status(status).json({ error: status === 500 ? 'Server error. Please try again.' : 'Invalid or oversized JSON body.' });
  });
  return app;
}
