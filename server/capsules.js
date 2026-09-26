import { Router } from 'express';
import { requireAuth } from './auth.js';

const textFields = ['project_name', 'prompt_title', 'prompt_version', 'prompt_text',
  'response_summary', 'category', 'usefulness', 'screenshot_url', 'notes'];
const fields = [...textFields, 'reviewed', 'improved'];

function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('A capsule object is required.');
  if ('user_id' in body) throw new Error('User ID must not be supplied.');
  const values = {};
  for (const field of textFields) {
    const value = body[field] ?? '';
    if (typeof value !== 'string' || value.length > 20000) throw new Error(`Invalid ${field}.`);
    values[field] = value.trim();
  }
  for (const field of ['project_name', 'prompt_title', 'prompt_text']) {
    if (!values[field]) throw new Error(`${field} is required.`);
  }
  for (const field of ['reviewed', 'improved']) {
    const value = body[field] ?? false;
    if (![true, false, 0, 1].includes(value)) throw new Error(`Invalid ${field}.`);
    values[field] = Number(value);
  }
  if (values.screenshot_url) {
    let url;
    try { url = new URL(values.screenshot_url); } catch { throw new Error('Screenshot URL must be a valid HTTP or HTTPS URL.'); }
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Screenshot URL must use HTTP or HTTPS.');
  }
  return fields.map(field => values[field]);
}

export function capsuleRoutes(db, secret) {
  const router = Router();
  router.use(requireAuth(secret));
  router.param('id', (req, res, next, id) => {
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return res.status(400).json({ error: 'Invalid capsule ID.' });
    next();
  });
  router.get('/', (req, res) => {
    res.json(db.prepare('SELECT * FROM capsules WHERE user_id = ? ORDER BY id DESC').all(req.user.id));
  });
  router.post('/', (req, res) => {
    let values;
    try { values = validate(req.body); } catch (error) { return res.status(400).json({ error: error.message }); }
    const result = db.prepare(`INSERT INTO capsules (user_id, ${fields.join(', ')}) VALUES (?, ${fields.map(() => '?').join(', ')})`)
      .run(req.user.id, ...values);
    res.status(201).json(db.prepare('SELECT * FROM capsules WHERE id = ? AND user_id = ?').get(result.lastInsertRowid, req.user.id));
  });
  router.put('/:id', (req, res) => {
    let values;
    try { values = validate(req.body); } catch (error) { return res.status(400).json({ error: error.message }); }
    const result = db.prepare(`UPDATE capsules SET ${fields.map(field => `${field} = ?`).join(', ')} WHERE id = ? AND user_id = ?`)
      .run(...values, req.params.id, req.user.id);
    if (!result.changes) return res.status(404).json({ error: 'Capsule not found.' });
    res.json(db.prepare('SELECT * FROM capsules WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id));
  });
  router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM capsules WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    if (!result.changes) return res.status(404).json({ error: 'Capsule not found.' });
    res.sendStatus(204);
  });
  return router;
}
