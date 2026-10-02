import { test, expect, type Page } from '@playwright/test';

async function freeCatalog(page: Page) {
  await page.route('**/api/tmdb?**', route => route.fulfill({ status: 503, json: {} }));
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Free to Watch' }).click();
}
async function actualPlayback(page: Page) {
  await expect.poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => Number.isFinite(v.duration) && v.duration > 0), { timeout: 30000 }).toBe(true);
  await page.locator('video').evaluate(async (v: HTMLVideoElement) => {
    v.muted = true;
    v.pause();
    await new Promise<void>((resolve, reject) => {
      v.addEventListener('playing', () => resolve(), { once: true });
      v.play().catch(reject);
    });
  });
  const before = await page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime);
  await expect.poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(before + 0.3);
  return page.locator('video').evaluate((v: HTMLVideoElement) => ({ duration: v.duration, currentTime: v.currentTime, source: v.currentSrc }));
}
for (const [provider, preferredTitle] of [['Internet Archive', 'Jack Frost'], ['Wikimedia Commons', 'Paula Vázquez et al. - Miñocas']]) {
  test(`dynamic ${provider}: verified discovery, actual playback and cached reload`, async ({ page }) => {
    test.setTimeout(180000);
    const events: unknown[] = [];
    page.on('console', message => { if (message.text().startsWith('[Free Legal playback]')) void message.args()[1]?.jsonValue().then(value => events.push(value)); });
    await freeCatalog(page);
    const catalog = await page.request.get('/api/free-catalog').then(r => r.json());
    const available = catalog.items.filter((m: { sourceProvider: string; playable: boolean }) => m.sourceProvider === provider && m.playable);
    expect(available.length, `${provider} must discover a transport-verified film`).toBeGreaterThan(0);
    const title = (available.find((m: {title: string}) => m.title === preferredTitle) || available[0]).title;
    await expect(page.getByRole('button', { name: `View ${title}`, exact: true })).toBeVisible({ timeout: 120000 });
    await page.getByRole('button', { name: `View ${title}`, exact: true }).click();
    await expect(page.getByRole('button', { name: 'Watch Free', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Watch Free', exact: true }).click();
    console.log('DYNAMIC_PLAYBACK', provider, await actualPlayback(page));
    console.log('DYNAMIC_EVENTS', JSON.stringify(events));
    await page.getByRole('button', { name: 'Back to movie details' }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: `View ${title}`, exact: true }).first()).toBeVisible({ timeout: 120000 });
    await expect.poll(() => page.evaluate(async () => {
      // @ts-ignore Vite serves the module for browser-side diagnostics.
      const { catalogDiagnostics } = await import('/src/services/freeCatalog.ts');
      return catalogDiagnostics.verifiedFreeCount;
    })).toBeGreaterThan(3);
    console.log('COUNTS', await page.evaluate(async () => {
      // @ts-ignore Vite module.
      return (await import('/src/services/freeCatalog.ts')).catalogDiagnostics;
    }));
    await page.screenshot({ path: `.cache/dynamic-${provider.replaceAll(' ', '-')}.png` });
  });
}

test('unsupported legal media stays in catalog with View Legal Source, and codec priority filters unsupported formats', async ({ page }) => {
  const item = { id: 'commons:42', title: 'Unsupported legal film', genres: [], captionTracks: [], sourceProvider: 'Wikimedia Commons', sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Example.webm', licenseType: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', attribution: 'Artist', verifiedLegal: true, playable: true, playbackCandidates: [{ url: 'https://upload.wikimedia.org/unsupported.mov', mimeType: 'video/quicktime; codecs="mp4v"', health: 'unknown', transportVerified: true }] };
  await page.route('**/api/free-catalog?**', route => route.fulfill({ json: { items: [item], verifiedFreeCount: 1, playableFreeCount: 1 } }));
  await freeCatalog(page);
  await page.getByRole('button', { name: 'View Unsupported legal film', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Watch Free', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'View Legal Source', exact: true }).first()).toBeVisible();
  const results = await page.evaluate(async () => {
    // @ts-ignore Vite module.
    const { compatibleCandidates, failed, isBroken, revalidate } = await import('/src/services/playbackHealth.ts');
    const input = [{url:'a', mimeType:'video/quicktime; codecs="mp4v"'}, {url:'b', mimeType:'video/webm; codecs="vp9, opus"'}, {url:'c', mimeType:'video/mp4'}];
    const candidates = compatibleCandidates(input).map((c: {url: string}) => c.url);
    failed('b'); failed('b'); const broken = isBroken('b');
    const filtered = compatibleCandidates(input).map((c: {url: string}) => c.url);
    revalidate('b');
    return { candidates, broken, filtered, revalidated: !isBroken('b') };
  });
  expect(results.candidates).not.toContain('a');
  expect(results.candidates[0]).toBe('b');
  expect(results.broken).toBe(true);
  expect(results.filtered).not.toContain('b');
  expect(results.revalidated).toBe(true);
});

test('Lost Flower exposes Watch Free only after verified browser playback health', async ({ page }) => {
  test.setTimeout(150000);
  await freeCatalog(page);
  const title = 'Adisra Promthep - Lost Flower (2012)';
  await expect(page.getByRole('button', { name: `View ${title}`, exact: true })).toBeVisible({ timeout: 120000 });
  await page.getByRole('button', { name: `View ${title}`, exact: true }).click();
  const watch = page.getByRole('button', { name: 'Watch Free', exact: true });
  if (await watch.count()) {
    await watch.click();
    console.log('LOST_FLOWER_PLAYBACK', await actualPlayback(page));
  } else {
    await expect(page.getByRole('link', { name: 'View Legal Source', exact: true }).first()).toHaveAttribute('href', 'https://commons.wikimedia.org/wiki/File:Adisra_Promthep_-_Lost_Flower_(2012).webm');
    console.log('LOST_FLOWER_SOURCE_ONLY: no verified browser-compatible healthy candidate');
  }
});
