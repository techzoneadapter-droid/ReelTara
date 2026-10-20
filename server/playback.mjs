import { registry, curatedCandidate, verifyArchive, verifyCommons, probeMedia } from './sourceVerification.mjs';

// Legacy URLs are accepted only for exact, reviewed seed entries. Dynamic requests
// carry provider IDs and file keys, never a client-selected network destination.
const reviewed = new Map(Object.entries(registry).flatMap(([id,s]) => [s.playbackUrl, ...s.fallbackPlaybackUrls].map((url,index) => [url, { id,index }])));
export async function playbackResponse(input, fetcher = fetch) {
  const p = new URL(input, 'http://localhost').searchParams;
  let candidate;
  try {
    if (p.has('url')) {
      const entry = reviewed.get(p.get('url'));
      if (!entry) return { status: 400, body: { ok: false, error: 'unreviewed_source' } };
      candidate = curatedCandidate(entry.id, entry.index);
    } else if (['internet_archive', 'wikimedia'].includes(p.get('provider'))) {
      const entry = [...reviewed.entries()].find(([url]) => {
        const parts = new URL(url).pathname.split('/');
        return p.get('provider') === 'internet_archive' && parts[2] === p.get('sourceId') &&
          decodeURIComponent(parts.slice(3).join('/')) === p.get('fileName');
      });
      if (!entry) return { status: 400, body: { ok: false, error: 'unreviewed_source' } };
      candidate = curatedCandidate(entry[1].id, entry[1].index);
    } else if (p.get('provider') === 'blender') {
      candidate = curatedCandidate(p.get('sourceId'), Number(p.get('index') || 0));
    } else return { status: 400, body: { ok: false, error: 'unreviewed_source' } };
    if (!candidate) return { status: 400, body: { ok: false, error: 'unverified_file' } };
    const probe = await probeMedia(candidate, fetcher, { force: p.get('revalidate') === '1' });
    return { status: 200, body: { ...probe, candidate, verifiedLegal: true, playable: probe.ok } };
  } catch (error) {
    return { status: 400, body: { ok: false, error: error.message } };
  }
}
