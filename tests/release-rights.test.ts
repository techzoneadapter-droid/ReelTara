import test from 'node:test';
import assert from 'node:assert/strict';
import { movies } from '../src/data/movies';
import { canPlay } from '../src/utils/legal';
import { playbackCandidates, resetPlaybackHealth } from '../src/services/freePlayback';
import { failed, isBroken } from '../src/services/playbackHealth';
import { reviewedCatalogItem } from '../src/utils/releaseRights';

test('old stored records and forged API approval cannot enable an unreviewed film', () => {
  const bunny = movies.find(m => m.id === 'bunny')!;
  const forged = { ...bunny, id: 'archive:commercial-upload', verifiedLegal: true, playable: true };
  assert.equal(canPlay(forged), false);
  assert.deepEqual(playbackCandidates(forged), []);
  assert.equal(reviewedCatalogItem({ id: forged.id, sourcePageUrl: bunny.source!.sourceUrl, licenseUrl: bunny.source!.licenseUrl, playbackCandidates: [{ url: bunny.source!.playableUrl! }] }), false);
  assert.equal(canPlay({ ...bunny, source: { ...bunny.source!, playableUrl: 'https://archive.org/download/BigBuckBunny_124/unreviewed.mp4' } }), false);
  for (const movie of movies.filter(m => !m.free)) assert.equal(canPlay({ ...movie, source: bunny.source }), false);
});

test('release catalog never starts dynamic upload crawlers', async () => {
  const { freeCatalogResponse } = await import('../server/freeCatalog.mjs');
  const original = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = async input => { requested.push(String(input)); return new Response(null, { status: 206, headers: { 'content-type': 'video/mp4' } }); };
  try {
    const { body } = await freeCatalogResponse();
    assert.deepEqual(body.items.map((m: { id: string }) => m.id).sort(), ['bunny','sintel','steel']);
    assert.equal(requested.some(url => /advancedsearch|w\/api.php/.test(url)), false);
    for (const item of body.items) assert.equal(reviewedCatalogItem(item), true);
  } finally { globalThis.fetch = original; }
});

test('Retry revalidates every reviewed URL even when prior failures excluded it', () => {
  const bunny = movies.find(m=>m.id==='bunny')!;
  const url = bunny.freeSource!.playbackUrl;
  failed(url); failed(url);
  assert.equal(isBroken(url), true);
  resetPlaybackHealth(bunny);
  assert.equal(isBroken(url), false);
  assert.equal(playbackCandidates(bunny)[0].url, url);
});
