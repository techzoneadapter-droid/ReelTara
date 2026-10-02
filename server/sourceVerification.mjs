import { readFileSync } from 'node:fs';
export const registry = JSON.parse(readFileSync(new URL('../src/data/freeSources.json', import.meta.url), 'utf8'));
export const clean = value => String(value || '').replace(/<[^>]*>/g, '').trim();
export const openLicense = value => /^https?:\/\/(?:www\.)?creativecommons\.org\/(?:licenses\/(?:by|by-sa)\/[1-4]\.0(?:\/[a-z]{2})?|publicdomain\/(?:zero|mark)\/1\.0)\/?$/i.test(String(value || ''));
const hosts = {
  internet_archive: host => host === 'archive.org' || /^(?:[a-z0-9-]+\.)+archive\.org$/.test(host),
  wikimedia: host => ['commons.wikimedia.org', 'upload.wikimedia.org'].includes(host),
  blender: host => host === 'download.blender.org',
};
export function trustedUrl(value, provider) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !hosts[provider]?.(url.hostname)) throw new Error('Untrusted provider URL');
  return url.href;
}
// All hops, including metadata redirects, are checked before making a request.
export async function providerFetch(url, provider, fetcher = fetch, options = {}) {
  const signal = options.signal || AbortSignal.timeout(6500);
  for (let hop = 0; hop < 5; hop++) {
    url = trustedUrl(url, provider);
    const response = await fetcher(url, { ...options, redirect: 'manual', signal });
    if (![301,302,303,307,308].includes(response.status)) return { response, finalUrl: url };
    const location = response.headers.get('location');
    void response.body?.cancel().catch(() => {});
    if (!location) throw new Error('Missing redirect location');
    url = new URL(location, url).href;
  }
  throw new Error('Too many redirects');
}
async function metadata(url, provider, fetcher) {
  const { response } = await providerFetch(url, provider, fetcher, { headers: { Accept: 'application/json' } });
  if (!response.ok) { void response.body?.cancel().catch(() => {}); throw new Error(`Metadata HTTP ${response.status}`); }
  return response.json();
}
export function archiveCandidates(identifier, data) {
  const m = data.metadata;
  const license = Array.isArray(m?.licenseurl) ? m.licenseurl.find(openLicense) : m?.licenseurl;
  if (m?.mediatype !== 'movies' || m.is_dark || data.is_dark || m['access-restricted-item'] === 'true' || m['access-restricted-item'] === true || !openLicense(license) || !m.creator) throw new Error('Unverified Archive license or identity');
  return (data.files || []).filter(f => !f.private && !f.is_dark && !f.name.split('/').some(part => part === '..' || part === '.') && !/[\\\x00-\x1f]/.test(f.name) && !/(?:preview|sample|thumb|trailer)/i.test(f.name) && /\.(mp4|webm|ogv|ogg)$/i.test(f.name) && /MPEG4|h\.264|mp4|webm|ogg|theora/i.test(f.format || '')).map(f => ({
    sourceProvider: 'internet_archive', sourceId: identifier, fileName: f.name,
    url: `https://archive.org/download/${identifier}/${encodeURIComponent(f.name)}`,
    mimeType: /\.mp4$/i.test(f.name) ? 'video/mp4' : /\.webm$/i.test(f.name) ? 'video/webm' : 'video/ogg',
    verifiedLegal: true, licenseType: 'Creative Commons', licenseUrl: license, attribution: `${clean(m.title)} — ${clean(m.creator)}`, health: 'unknown',
  })).sort((a,b) => Number(!a.mimeType.startsWith('video/mp4')) - Number(!b.mimeType.startsWith('video/mp4')));
}
export async function verifyArchive(identifier, fetcher = fetch) {
  if (!/^[a-zA-Z0-9][\w.-]{0,199}$/.test(identifier)) throw new Error('Invalid Archive identifier');
  const data = await metadata(`https://archive.org/metadata/${identifier}`, 'internet_archive', fetcher);
  return { data, candidates: archiveCandidates(identifier, data) };
}
export function commonsCandidates(page) {
  const info = page.videoinfo?.[0], meta = info?.extmetadata || {};
  if (page.missing !== undefined || !info || !openLicense(meta.LicenseUrl?.value) || !meta.Artist?.value || meta.Restrictions?.value) throw new Error('Unverified Commons license');
  const derivatives = info.derivatives || [];
  // Keep the original's codec information when supplied; do not duplicate it with a generic MIME.
  const media = [...derivatives, ...(!derivatives.some(d => d.src.split('?')[0] === info.url?.split('?')[0]) ? [{src: info.url, type: info.mime, height: info.height}] : [])];
  return media.filter(d => /^video\/(mp4|webm|ogg)(?:;|$)/i.test(d.type || '')).flatMap(d => {
    try {
      const url = new URL(trustedUrl(d.src, 'wikimedia'));
      if (url.hostname !== 'upload.wikimedia.org') return [];
      return [{ sourceProvider: 'wikimedia', sourceId: String(page.pageid), fileName: d.transcodekey || 'original', url: url.href, mimeType: d.type, height: Number(d.height) || undefined, quality: d.height ? `${d.height}p` : undefined, verifiedLegal: true, licenseType: clean(meta.LicenseShortName?.value), licenseUrl: meta.LicenseUrl.value, attribution: clean(meta.Artist.value), health: 'unknown' }];
    } catch { return []; }
  }).sort((a,b) => Number(!a.mimeType.startsWith('video/mp4')) - Number(!b.mimeType.startsWith('video/mp4')) || Math.abs((a.height || 720)-720)-Math.abs((b.height || 720)-720));
}
export async function verifyCommons(sourceId, fetcher = fetch) {
  if (!/^\d{1,12}$/.test(sourceId)) throw new Error('Invalid Commons page ID');
  const params = new URLSearchParams({ action: 'query', format: 'json', pageids: sourceId, prop: 'videoinfo', viprop: 'url|size|mime|extmetadata|derivatives' });
  const data = await metadata(`https://commons.wikimedia.org/w/api.php?${params}`, 'wikimedia', fetcher);
  const page = data.query?.pages?.[sourceId];
  if (!page) throw new Error('Commons file not found');
  return commonsCandidates(page);
}
const probeCache = new Map();
const cooldowns = new Map();
export async function probeMedia(candidate, fetcher = fetch, { force = false } = {}) {
  const live = fetcher === fetch;
  const cached = live && probeCache.get(candidate.url);
  if (!force && cached?.expires > Date.now()) return cached.result;
  if (live && (cooldowns.get(candidate.sourceProvider) || 0) > Date.now()) {
    return { ok: false, status: 429, playbackUrl: candidate.url, error: 'provider_rate_limited', retryAfter: Math.ceil((cooldowns.get(candidate.sourceProvider) - Date.now()) / 1000) };
  }
  try {
    const { response, finalUrl } = await providerFetch(candidate.url, candidate.sourceProvider, fetcher, { headers: { Range: 'bytes=0-0' } });
    const h = response.headers, contentType = h.get('content-type');
    const result = { ok: [200,206].includes(response.status) && /^video\//i.test(contentType || ''), playbackUrl: candidate.url, finalUrl, status: response.status, contentType, contentLength: h.get('content-length'), contentRange: h.get('content-range'), rangeSupported: response.status === 206 || h.get('accept-ranges') === 'bytes', retryAfter: h.get('retry-after') };
    void response.body?.cancel().catch(() => {});
    if (live) {
      if (response.status === 429) {
        const value = h.get('retry-after');
        const seconds = /^\d+$/.test(value || '') ? Number(value) : Math.max(0, (Date.parse(value || '') - Date.now()) / 1000);
        cooldowns.set(candidate.sourceProvider, Date.now() + (Number.isFinite(seconds) ? Math.max(60, seconds) : 600) * 1000);
      }
      probeCache.set(candidate.url, { result, expires: Date.now() + (result.ok ? 300000 : 60000) });
      if (probeCache.size > 400) probeCache.delete(probeCache.keys().next().value);
    }
    return result;
  } catch (error) { return { ok: false, playbackUrl: candidate.url, error: error.message }; }
}
export function curatedCandidate(sourceId, index = 0) {
  const s = registry[sourceId];
  if (!s) throw new Error('Unreviewed Blender film');
  const url = [s.playbackUrl, ...s.fallbackPlaybackUrls][index];
  if (!url) throw new Error('Unknown curated candidate');
  return { sourceProvider: new URL(url).hostname === 'archive.org' ? 'internet_archive' : 'blender', sourceId, url, mimeType: 'video/mp4', verifiedLegal: true, licenseType: s.licenseType, licenseUrl: s.licenseUrl, attribution: s.attribution, health: 'unknown' };
}
