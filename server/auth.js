import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';

export const cookieOptions = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' };
const jwtOptions = { algorithms: ['HS256'], issuer: 'ai-capsule', audience: 'ai-capsule' };

export function requireAuth(secret, redirectToLogin = false) {
  return (req, res, next) => {
    try {
      const claims = jwt.verify(req.cookies.token, secret, jwtOptions);
      if (typeof claims.sub !== 'string' || !/^\d+$/.test(claims.sub)) throw new Error('Invalid user');
      req.user = { id: claims.sub, login: claims.login };
      next();
    } catch {
      if (redirectToLogin) return res.redirect('/login');
      res.status(401).json({ error: 'Please log in with GitHub.' });
    }
  };
}

export function authRoutes(config, fetchGithub = fetch) {
  const router = Router();
  const callback = `${config.appUrl}/api/auth/github/callback`;
  const authCookieOptions = { ...cookieOptions, secure: new URL(config.appUrl).protocol === 'https:' };
  router.get('/github/start', (req, res) => {
    if (!config.clientId || !config.clientSecret) return res.redirect('/login?error=configuration');
    const state = randomBytes(32).toString('hex');
    res.cookie('oauth_state', state, { ...authCookieOptions, signed: true, maxAge: 600000 });
    const params = new URLSearchParams({ client_id: config.clientId, redirect_uri: callback, state, scope: 'read:user' });
    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
  });

  router.get('/github/callback', async (req, res) => {
    const expected = req.signedCookies.oauth_state;
    res.clearCookie('oauth_state', authCookieOptions);
    if (typeof req.query.state !== 'string' || !expected || req.query.state !== expected) {
      return res.status(400).send('Invalid login state. Return to /login and try again.');
    }
    if (req.query.error) return res.redirect('/login?error=denied');
    if (typeof req.query.code !== 'string' || !req.query.code) return res.status(400).send('Missing OAuth code.');
    try {
      const exchange = await fetchGithub('https://github.com/login/oauth/access_token', {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret,
          code: req.query.code, redirect_uri: callback }), signal: AbortSignal.timeout(15000)
      });
      const tokenData = await exchange.json();
      if (!exchange.ok || tokenData.error || !tokenData.access_token) throw new Error('OAuth exchange failed');
      const profileResponse = await fetchGithub('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/vnd.github+json',
          'User-Agent': 'AI-Capsule', 'X-GitHub-Api-Version': '2022-11-28' }, signal: AbortSignal.timeout(15000)
      });
      const profile = await profileResponse.json();
      if (!profileResponse.ok || !Number.isSafeInteger(profile.id) || profile.id <= 0 || typeof profile.login !== 'string') {
        throw new Error('Invalid GitHub profile');
      }
      const token = jwt.sign({ login: profile.login }, config.secret, {
        algorithm: 'HS256', subject: String(profile.id), issuer: 'ai-capsule', audience: 'ai-capsule', expiresIn: '2h'
      });
      res.cookie('token', token, { ...authCookieOptions, maxAge: 7200000 });
      res.redirect('/dashboard');
    } catch {
      res.redirect('/login?error=github');
    }
  });
  router.get('/me', requireAuth(config.secret), (req, res) => res.json(req.user));
  router.post('/logout', (req, res) => {
    res.clearCookie('token', authCookieOptions);
    res.sendStatus(204);
  });
  return router;
}
