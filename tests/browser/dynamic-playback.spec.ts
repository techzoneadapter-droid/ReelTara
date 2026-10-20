import { test, expect } from '@playwright/test';

test('release rejects old API films carrying unreviewed uploader license claims', async ({ page }) => {
  await page.route('**/api/tmdb?**', route => route.fulfill({ status: 503, json: {} }));
  const unreviewed = { id: 'commons:42', title: 'Unreviewed upload', genres: [], captionTracks: [],
    sourceProvider: 'Wikimedia Commons', sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Example.webm',
    licenseType: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', attribution: 'Uploader',
    verifiedLegal: true, playable: true, playbackCandidates: [{ url: 'https://upload.wikimedia.org/movie.webm', mimeType: 'video/webm', transportVerified: true }] };
  let mediaRequests = 0;
  await page.route('https://upload.wikimedia.org/**', route => { mediaRequests++; return route.abort(); });
  await page.route('**/api/free-catalog?**', route => route.fulfill({ json: { items: [unreviewed] } }));
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Free to Watch' }).click();
  await expect.poll(() => page.evaluate(async () => {
    // @ts-ignore Browser module served by Vite.
    return (await import('/src/services/freeCatalog.ts')).catalogDiagnostics.freeItemCount;
  })).toBe(0);
  await expect(page.getByRole('button', { name: 'View Unreviewed upload' })).toHaveCount(0);
  expect(mediaRequests).toBe(0);
});

test('release playback endpoint denies an unreviewed file before making a media request', async ({ request }) => {
  const response = await request.get('/api/playback?provider=internet_archive&sourceId=unreviewed-upload&fileName=movie.mp4&verifiedLegal=true');
  expect(response.status()).toBe(400);
  expect(await response.json()).toMatchObject({ ok: false, error: 'unreviewed_source' });
});
