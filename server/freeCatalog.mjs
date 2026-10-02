import { readFileSync } from 'node:fs';
import { cached, json } from './cache.mjs';
const registry = JSON.parse(readFileSync(new URL('../src/data/freeSources.json', import.meta.url), 'utf8'));
import { clean, openLicense, archiveCandidates, commonsCandidates, probeMedia } from './sourceVerification.mjs';
export { openLicense } from './sourceVerification.mjs';
const candidate = (url, mimeType = 'video/mp4', height) => ({ url, mimeType, height, health: 'unknown' });
function film(data) {
  const item = { overview: '', posterUrl: '', genres: ['Short film'], captionTracks: [], ...data, verifiedLegal: true, playable: data.playbackCandidates.length > 0, lastVerifiedAt: new Date().toISOString() };
  return item;
}
export class CuratedLegalAdapter {
  async load() { return Object.entries(registry).map(([id, s]) => film({ id, title: { bunny: 'Big Buck Bunny', sintel: 'Sintel', steel: 'Tears of Steel' }[id], creator: 'Blender Foundation', sourceProvider: 'Blender Foundation', sourcePageUrl: s.sourcePageUrl, playbackCandidates: [s.playbackUrl, ...s.fallbackPlaybackUrls].map(url => candidate(url)), licenseType: s.licenseType, licenseUrl: s.licenseUrl, attribution: s.attribution })); }
}
export class InternetArchiveAdapter {
  async load() {
    return cached('archive-films', 86400000, async () => {
      const query = 'mediatype:movies AND collection:animationandcartoons AND (licenseurl:"https://creativecommons.org/licenses/by/4.0/" OR licenseurl:"http://creativecommons.org/licenses/by/3.0/" OR licenseurl:"http://creativecommons.org/publicdomain/mark/1.0/")';
      const data = await json('https://archive.org/advancedsearch.php?' + new URLSearchParams({ q: query, 'fl[]': 'identifier', rows: '60', output: 'json', sort: 'downloads desc' }));
      const results = [];
      const docs = data.response?.docs || [];
      for (let i = 0; i < docs.length; i += 20) {
        const batch = await Promise.allSettled(docs.slice(i, i + 20).map(async ({ identifier }) => {
          if (!/^[\w.-]+$/.test(identifier)) return null;
          const archive = await json(`https://archive.org/metadata/${identifier}`);
          const { metadata: m } = archive;
          const license = Array.isArray(m?.licenseurl) ? m.licenseurl[0] : m?.licenseurl;
          if (m?.mediatype !== 'movies' || !openLicense(license) || !m.creator || /trailer|sample|home movie|test footage/i.test(m.title)) return null;
          const media = archiveCandidates(identifier, archive).slice(0, 4);
          return film({ id: `archive:${identifier}`, title: clean(m.title), overview: clean(m.description).slice(0, 1500), creator: clean(m.creator), year: parseInt(m.year || m.date) || undefined, sourceProvider: 'Internet Archive', sourcePageUrl: `https://archive.org/details/${identifier}`, posterUrl: `https://archive.org/services/img/${identifier}`, licenseType: 'Creative Commons', licenseUrl: license.replace(/^http:/, 'https:'), attribution: `${clean(m.title)} — ${clean(m.creator)}`, playbackCandidates: media });
        }));
        results.push(...batch.flatMap(r => r.status === 'fulfilled' && r.value ? [r.value] : []));
      }
      return results;
    });
  }
}
export class WikimediaCommonsAdapter {
  async load() {
    return cached('commons-films', 86400000, async () => {
      const params = new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrsearch: 'filetype:video incategory:"Animated short films"', gsrnamespace: '6', gsrlimit: '50', prop: 'videoinfo', viprop: 'url|size|mime|extmetadata|derivatives', viurlwidth: '500' });
      const data = await json(`https://commons.wikimedia.org/w/api.php?${params}`);
      return Object.values(data.query?.pages || {}).flatMap(page => {
        const info = page.videoinfo?.[0]; const meta = info?.extmetadata || {};
        const license = meta.LicenseUrl?.value;
        if (!info || !openLicense(license) || !meta.Artist?.value || meta.Restrictions?.value || (!Number.isFinite(info.duration) || info.duration < 60) || /trailer|sample|test|without audio|challenge/i.test(page.title)) return [];
        const choices = commonsCandidates(page);
        return [film({ id: `commons:${page.pageid}`, title: clean(meta.ObjectName?.value || page.title.replace(/^File:/, '').replace(/\.(webm|ogv|mp4)$/i, '')), overview: clean(meta.ImageDescription?.value).slice(0,1500), creator: clean(meta.Artist.value), runtime: Math.round(info.duration / 60), posterUrl: info.thumburl || '', sourceProvider: 'Wikimedia Commons', sourcePageUrl: info.descriptionurl, licenseType: clean(meta.LicenseShortName?.value), licenseUrl: license.replace(/^http:/, 'https:'), attribution: `${clean(meta.Artist.value)} · ${clean(meta.Credit?.value)}`, playbackCandidates: choices })];
      });
    });
  }
}
export class BlenderOpenMovieAdapter extends CuratedLegalAdapter {}
function bounded(promise, ms = 25000) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Source timeout')), ms); })]).finally(() => clearTimeout(timer));
}
export async function freeCatalogResponse() {
  const body = await cached('free-catalog', 3600000, async () => {
    const adapters = [new CuratedLegalAdapter(), new InternetArchiveAdapter(), new WikimediaCommonsAdapter()];
    const results = await Promise.allSettled(adapters.map(a => bounded(a.load())));
    const unique = new Map();
    results.forEach(r => { if (r.status === 'fulfilled') r.value.forEach(item => {
      const key = item.title.toLowerCase().replace(/[^a-z0-9]/g,'');
      const previous = unique.get(key);
      if (previous) previous.playbackCandidates = [...new Map([...previous.playbackCandidates, ...item.playbackCandidates].map(c => [c.url,c])).values()]; else unique.set(key, item);
    }); });
    const items = [...unique.values()];
    // Transport verification is separate from actual browser media health.
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(4, items.length) }, async () => {
      while (cursor < items.length) {
        const item = items[cursor++];
        item.playbackCandidates = item.playbackCandidates.map((c, index) => c.sourceProvider ? c : { ...c, sourceProvider: 'blender', sourceId: item.id, index, verifiedLegal: true, licenseType: item.licenseType, licenseUrl: item.licenseUrl, attribution: item.attribution });
        item.playable = false;
        for (const c of item.playbackCandidates) {
          const probe = await probeMedia({ ...c, sourceProvider: new URL(c.url).hostname === 'archive.org' ? 'internet_archive' : c.sourceProvider });
          c.transportVerified = probe.ok;
          c.probe = probe;
          if (probe.ok) { item.playable = true; break; }
        }
      }
    }));
    return { items, lastFreeRefresh: new Date().toISOString(), freeItemCount: items.length, verifiedFreeCount: items.filter(i => i.verifiedLegal).length, playableFreeCount: items.filter(i => i.playable).length, sources: results.map((r,i) => ({ adapter: adapters[i].constructor.name, count: r.status === 'fulfilled' ? r.value.length : 0, status: r.status })) };
  });
  return { status: 200, body };
}
