import { test, expect } from '@playwright/test';
test('discovery loads a second page and preserves cached responses on reload', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/free-catalog', route => route.fulfill({ json: { items: [], freeItemCount: 0, playableFreeCount: 0 } }));
  await page.route('**/api/tmdb?**', route => {
    const url = new URL(route.request().url()); const path = url.searchParams.get('path');
    if (path === 'genre/movie/list') return route.fulfill({ json: { genres: [] } });
    calls++;
    const second = url.searchParams.get('page') === '2';
    return route.fulfill({ json: { results: Array.from({ length: 20 }, (_, i) => ({ id: i + (second ? 100 : 1), title: `${second ? 'Next' : 'First'} Film ${i}`, release_date: '2026-01-01' })) } });
  });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Discover', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View First Film 0', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Load more', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View Next Film 0', exact: true })).toBeVisible();
  const before = calls;
  await page.reload();
  await expect(page.getByRole('button', { name: 'View First Film 0', exact: true }).first()).toBeVisible();
  expect(calls).toBe(before);
});
