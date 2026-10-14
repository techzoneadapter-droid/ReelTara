import { readFileSync } from 'node:fs';
import { cached, json } from './cache.mjs';
const registry = JSON.parse(readFileSync(new URL('../src/data/freeSources.json', import.meta.url), 'utf8'));
import {licensedArtwork} from './artwork.mjs';
import { clean, openLicense, commonsCandidates } from './sourceVerification.mjs';
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
    // The uploader-license search cannot establish rights. Only reviewed creator mirrors qualify.
    return []; // Creator mirror candidates are already supplied by CuratedLegalAdapter.
  }
}
export class WikimediaCommonsAdapter {
  async load() {
    return cached('commons-films-art-v2', 86400000, async () => {
      const params = new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrsearch: 'filetype:video incategory:"Animated short films"', gsrnamespace: '6', gsrlimit: '50', prop: 'videoinfo', viprop: 'url|size|mime|extmetadata|derivatives', viurlwidth: '240' });
      const data = await json(`https://commons.wikimedia.org/w/api.php?${params}`);
      const items=Object.values(data.query?.pages || {}).flatMap(page => {
        const info = page.videoinfo?.[0]; const meta = info?.extmetadata || {};
        const license = meta.LicenseUrl?.value;
        if (!info || !openLicense(license) || !meta.Artist?.value || meta.Restrictions?.value || (!Number.isFinite(info.duration) || info.duration < 60) || /trailer|sample|test|without audio|challenge/i.test(page.title)) return [];
        const choices = commonsCandidates(page);
        info.artwork=licensedArtwork(page,info);
        return [film({ id: `commons:${page.pageid}`, title: clean(meta.ObjectName?.value || page.title.replace(/^File:/, '').replace(/\.(webm|ogv|mp4)$/i, '')), overview: clean(meta.ImageDescription?.value).slice(0,1500), creator: clean(meta.Artist.value), runtime: Math.round(info.duration / 60), posterUrl: info.artwork?.posterUrl || '', artwork: info.artwork, sourceProvider: 'Wikimedia Commons', sourcePageUrl: info.descriptionurl, licenseType: clean(meta.LicenseShortName?.value), licenseUrl: license.replace(/^http:/, 'https:'), attribution: `${clean(meta.Artist.value)} · ${clean(meta.Credit?.value)}`, playbackCandidates: choices })];
      });
      // Resolve larger hero frames only for five eligible films. Listing stays at 240px.
      const ids=items.filter(i=>i.artwork).slice(0,5).map(i=>i.id.split(':')[1]);
      if(ids.length)try{
       const p=new URLSearchParams({action:'query',format:'json',pageids:ids.join('|'),prop:'videoinfo',viprop:'url|extmetadata',viextmetadatafilter:'Artist|LicenseShortName|LicenseUrl|Restrictions|Credit',viurlwidth:'960'});
       const high=await json('https://commons.wikimedia.org/w/api.php?'+p);
       for(const page of Object.values(high.query?.pages||{})){const art=licensedArtwork(page,page.videoinfo?.[0]);const item=items.find(i=>i.id==='commons:'+page.pageid);if(art&&item?.artwork)item.artwork.backdropUrl=art.posterUrl;}
      }catch{/* Small licensed thumbnail remains the safe fallback. */}
      return items;
    });
  }
}
export class BlenderOpenMovieAdapter extends CuratedLegalAdapter {}
function bounded(promise, ms = 25000) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Source timeout')), ms); })]).finally(() => clearTimeout(timer));
}
export async function freeCatalogResponse() {
  const body = await cached('free-catalog-art-v2', 3600000, async () => {
    const adapters = [new CuratedLegalAdapter(), new InternetArchiveAdapter(), new WikimediaCommonsAdapter()];
    const results = await Promise.allSettled(adapters.map(a => bounded(a.load())));
    const unique = new Map();
    results.forEach(r => { if (r.status === 'fulfilled') r.value.forEach(item => {
      const key = item.title.toLowerCase().replace(/[^a-z0-9]/g,'');
      const previous = unique.get(key);
      if (previous) previous.playbackCandidates = [...new Map([...previous.playbackCandidates, ...item.playbackCandidates].map(c => [c.url,c])).values()]; else unique.set(key, item);
    }); });
    const items = [...unique.values()];
    // Legal candidates are not evidence of browser playback; probe only the selected film.
    items.forEach(item=>{ item.playable=item.playbackCandidates.length>0; });
    return { items, lastFreeRefresh: new Date().toISOString(), freeItemCount: items.length, verifiedFreeCount: items.filter(i => i.verifiedLegal).length, playableFreeCount: 0, sources: results.map((r,i) => ({ adapter: adapters[i].constructor.name, count: r.status === 'fulfilled' ? r.value.length : 0, status: r.status })) };
  });
  return { status: 200, body };
}
