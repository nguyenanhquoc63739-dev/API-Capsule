import React, { useEffect, useState } from 'react';
import { api } from './api.js';

const empty = { project_name: '', prompt_title: '', prompt_version: 'v1', prompt_text: '', response_summary: '',
  category: 'Coding', usefulness: 'Good', reviewed: false, improved: false, screenshot_url: '', notes: '' };
const labels = { project_name: 'Project name', prompt_title: 'Prompt title', prompt_version: 'Prompt version',
  prompt_text: 'Prompt text', response_summary: 'Response summary', category: 'Category', usefulness: 'Usefulness',
  reviewed: 'Reviewed', improved: 'Improved', screenshot_url: 'Screenshot URL', notes: 'Notes' };
const longFields = ['prompt_text', 'response_summary', 'notes'];

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [capsules, setCapsules] = useState([]);
  const [form, setForm] = useState({ ...empty });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    Promise.all([api('/api/auth/me'), api('/api/capsules')])
      .then(([account, rows]) => { setUser(account); setCapsules(rows); })
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);
  function reset() { setForm({ ...empty }); setEditing(null); }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const row = await api(editing ? `/api/capsules/${editing}` : '/api/capsules', {
        method: editing ? 'PUT' : 'POST', body: JSON.stringify(form)
      });
      setCapsules(rows => editing ? rows.map(item => item.id === editing ? row : item) : [row, ...rows]);
      setMessage(editing ? 'Capsule updated.' : 'Capsule added.'); reset();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function remove(row) {
    if (!window.confirm(`Delete "${row.prompt_title}"?`)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await api(`/api/capsules/${row.id}`, { method: 'DELETE' });
      setCapsules(rows => rows.filter(item => item.id !== row.id));
      if (editing === row.id) reset();
      setMessage('Capsule deleted.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function edit(row) {
    setForm(Object.fromEntries(Object.keys(empty).map(key => [key, ['reviewed', 'improved'].includes(key) ? Boolean(row[key]) : row[key] || ''])));
    setEditing(row.id); setError(''); setMessage(''); window.scrollTo(0, 0);
  }
  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST' }); window.location.assign('/'); }
    catch (e) { setError(e.message); }
  }
  if (loading) return <p>Loading...</p>;
  if (!user) return <p role="alert">{error || 'Please log in.'} <a href="/login">Log in</a></p>;
  return <>
    <h2>My dashboard</h2><p>Signed in as {user.login}. <button onClick={logout} disabled={busy}>Log out</button></p>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <h3>{editing ? 'Edit capsule' : 'Add capsule'}</h3>
    <form onSubmit={save}><fieldset disabled={busy}><legend>Prompt details</legend>
      {Object.keys(empty).map(key => {
        const change = event => setForm({ ...form, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });
        const required = ['project_name', 'prompt_title', 'prompt_text'].includes(key);
        const props = { id: key, name: key, value: form[key], onChange: change, required, maxLength: 20000 };
        return <label key={key} htmlFor={key}>{labels[key]}{required ? ' *' : ''}
          {['reviewed', 'improved'].includes(key) ? <input id={key} type="checkbox" checked={form[key]} onChange={change} />
            : longFields.includes(key) ? <textarea {...props} rows="3" />
            : key === 'category' || key === 'usefulness' ? <select {...props}>
              {(key === 'category' ? ['Coding', 'Writing', 'Research', 'Study', 'Other'] : ['Good', 'Needs Improvement']).map(value => <option key={value}>{value}</option>)}
            </select> : <input {...props} type={key === 'screenshot_url' ? 'url' : 'text'} />}
        </label>;
      })}
      <button type="submit">{busy ? 'Saving, please wait....' : editing ? 'Save changes' : 'Add capsule'}</button>
      {editing && <button type="button" onClick={reset}>Cancel edit</button>}
    </fieldset></form>
    <h3>Saved capsules ({capsules.length})</h3>
    {!capsules.length && <p>No capsules yet. Add your first prompt above.</p>}
    {capsules.map(row => <article key={row.id}>
      <h4>{row.prompt_title}</h4>
      <dl>{Object.keys(empty).map(key => <React.Fragment key={key}>
        <dt>{labels[key]}</dt><dd>{['reviewed', 'improved'].includes(key) ? row[key] ? 'Yes' : 'No' : row[key] || '—'}</dd>
      </React.Fragment>)}<dt>Created at (UTC)</dt><dd>{row.created_at}</dd></dl>
      <button onClick={() => edit(row)} disabled={busy}>Edit</button><button onClick={() => remove(row)} disabled={busy}>Delete</button>
    </article>)}
  </>;
}
