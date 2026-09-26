export async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers } });
  if (response.status === 401) { window.location.assign('/login'); throw new Error('Please log in again.'); }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed. Please try again.');
  }
  return response.status === 204 ? null : response.json();
}
