import { providerFetch } from './sourceVerification.mjs';
const values = new Map();
const pending = new Map();
export async function cached(key, ttl, loader) {
  const hit = values.get(key);
  const refresh = () => {
    if (!pending.has(key)) {
      const task = loader().then(value => { values.set(key, { value, expires: Date.now() + ttl }); if (values.size > 400) values.delete(values.keys().next().value); return value; }).finally(() => pending.delete(key));
      pending.set(key, task);
    }
    return pending.get(key);
  };
  if (hit) { if (hit.expires < Date.now()) void refresh().catch(() => {}); return hit.value; }
  return refresh();
}
export async function json(url) {
  const { response: r } = await providerFetch(url, new URL(url).hostname === 'archive.org' ? 'internet_archive' : 'wikimedia', fetch, { headers: { Accept: 'application/json', 'User-Agent': 'ReelTara/1.0 (legal movie metadata catalog)' } });
  if (!r.ok) throw new Error(`Source unavailable (${r.status})`);
  return r.json();
}
