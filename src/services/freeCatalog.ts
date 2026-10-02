import type { FreeLegalMovie, Movie } from '../types/movie';
import { request, object } from './http';
import { compatibleCandidates, checkMedia, playbackQuery } from './playbackHealth';
import { movies } from '../data/movies';
export const catalogDiagnostics = { lastDiscoveryRefresh: '', lastFreeRefresh: '', discoveryItemCount: 0, freeItemCount: 0, verifiedFreeCount: 0, playableFreeCount: 0 };
export const FreeCatalogService = {
  async load(): Promise<Movie[]> {
    const data = await request('/api/free-catalog?version=2', object, 300000);
    if (!Array.isArray(data.items)) throw new Error('Invalid free catalog');
    const items = (data.items as FreeLegalMovie[]).filter(m => m.verifiedLegal);
    // Bounded parallel media checks; legal items remain visible even when every
    // candidate is unsupported, inaccessible, or undecodable in this browser.
    let cursor = 0;
    const checked = new Map<string, boolean>();
    await Promise.all(Array.from({ length: Math.min(6, items.length) }, async () => {
      while (cursor < items.length) {
        const m = items[cursor++];
        let playable = false;
        for (const c of compatibleCandidates(m.playbackCandidates.filter(c => c.transportVerified !== false))) {
          if (c.transportVerified !== true) {
            try {
              const response = await fetch(`/api/playback?${playbackQuery(c)}`, { signal: AbortSignal.timeout(10000), cache: 'no-store' });
              const probe = await response.json();
              if (!response.ok || !probe.ok || !probe.verifiedLegal) continue;
              Object.assign(c, probe.candidate, { transportVerified: true });
            } catch { continue; }
          }
          if (await checkMedia(c)) { playable = true; break; }
        }
        checked.set(m.id, playable);
      }
    }));
    Object.assign(catalogDiagnostics, { lastFreeRefresh: data.lastFreeRefresh, freeItemCount: items.length, verifiedFreeCount: items.length, playableFreeCount: [...checked.values()].filter(Boolean).length });
    return items.map(m => {
      const seed = movies.find(s => s.id === m.id);
      const candidates = compatibleCandidates(m.playbackCandidates);
      return { ...seed, playable: checked.get(m.id) === true, verifiedLegal: true, id: m.id, title: m.title, overview: m.overview || seed?.overview || '', year: m.year || seed?.year || 0, runtime: m.runtime, genre: seed?.genre || m.genres.join(' · '), rating: seed?.rating || 0, duration: m.runtime ? `${m.runtime}m` : seed?.duration || 'Short film', certificate: '', poster: m.posterUrl || seed?.poster || '', backdrop: m.backdropUrl || seed?.backdrop || '', director: m.creator || '', cast: [], free: true, provider: m.sourceProvider, providerUrl: m.sourcePageUrl, origin: 'curated' as const, contentMode: 'free_legal' as const, playbackCandidates: candidates, captionTracks: m.captionTracks, source: { name: m.sourceProvider, sourceUrl: m.sourcePageUrl, playableUrl: candidates[0]?.url, licenseUrl: m.licenseUrl || '', license: m.licenseType, attribution: m.attribution, verified: true }, freeSource: { sourceName: m.sourceProvider, sourcePageUrl: m.sourcePageUrl, playbackUrl: candidates[0]?.url, fallbackPlaybackUrls: candidates.slice(1).map(c => c.url), licenseType: m.licenseType, licenseUrl: m.licenseUrl || '', attribution: m.attribution } };
    });
  },
};
export const FreeCatalogAdapter = FreeCatalogService;
