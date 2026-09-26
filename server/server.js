import { createApp } from './app.js';
import { openDatabase } from './db.js';

const config = {
  appUrl: (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
  secret: process.env.JWT_SECRET,
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET
};
if (!config.secret || config.secret.length < 32) throw new Error('Set JWT_SECRET to a random value of at least 32 characters in .env or your cloud environment.');
const url = new URL(config.appUrl);
if (url.origin !== config.appUrl) throw new Error('APP_URL must be an origin without a path.');
if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') throw new Error('Production APP_URL must use HTTPS.');
const db = openDatabase(process.env.DATABASE_PATH || './data/capsules.sqlite');
const server = createApp(config, db).listen(Number(process.env.PORT || 3000), () => {
  console.log(`AI Capsule is running at ${config.appUrl}`);
  if (!config.clientId || !config.clientSecret) console.log('Set GitHub OAuth environment variables to enable login.');
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
