import { mkdirSync, writeFileSync } from 'node:fs';
const origin = 'https://reel-tara.vercel.app';
const checks = [
  ['free-catalog', origin + '/api/free-catalog?version=2'],
  ['tmdb-VN', origin + '/api/tmdb?path=movie/popular&region=VN'],
  ['unreviewed-playback', origin + '/api/playback?provider=internet_archive&sourceId=unreviewed-film&fileName=film.mp4'],
  ...['', 'privacy.html', 'terms.html', 'support.html', 'google-play.html'].map(p => ['website-' + (p || 'home'), 'https://nvbtech.com.vn/apps/reeltara/' + p]),
];
const results = await Promise.all(checks.map(async ([name, url]) => {
  try {
    const response = await fetch(url, { headers: { Origin: 'https://localhost' }, signal: AbortSignal.timeout(45000) });
    const type = response.headers.get('content-type') || '';
    const body = type.includes('json') ? await response.json() : await response.text();
    return { name, url, http: response.status, type, cors: response.headers.get('access-control-allow-origin'),
      ...(Array.isArray(body.items) ? { count: body.items.length, ids: body.items.map(m => m.id), unreviewedCount: body.items.filter(m => !['bunny','sintel','steel'].includes(m.id)).length } : {}),
      ...(name === 'tmdb-VN' ? { error: body.error, count: body.results?.length } : {}),
      ...(name === 'unreviewed-playback' ? { error: body.error, allowed: body.ok === true } : {}),
      ...(typeof body === 'string' ? { title: body.match(/<title>(.*?)<\/title>/s)?.[1], emails: [...new Set(body.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi) || [])] } : {}) };
  } catch { return { name, url, error: 'network-error-or-timeout' }; }
}));
const report = { checkedAt: new Date().toISOString(), results };
mkdirSync('.cache/release', { recursive: true });
writeFileSync('.cache/release/backend-audit.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
