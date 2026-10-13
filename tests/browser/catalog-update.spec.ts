import { test, expect } from '@playwright/test';
test('discovery loads a second page and preserves cached responses on reload', async ({ page }) => {
  let calls = 0;
  await page.route('**/api/free-catalog', route => route.fulfill({ json: { items: [], freeItemCount: 0, playableFreeCount: 0 } }));
  await page.route('**/api/open-catalog?**', route => {
    const n=Number(new URL(route.request().url()).searchParams.get('page'))||1;calls++;
    return route.fulfill({json:{hasMore:n<2,totalPages:2,items:Array.from({length:20},(_,i)=>({id:'wikidata:Q'+(i+(n===2?100:1)),title:(n===2?'Next':'First')+' Film '+i,year:2026,genre:'Film',rating:0,duration:'Film',certificate:'',poster:'',backdrop:'',overview:'',director:'',cast:[],provider:'',providerUrl:'',origin:'open_data',contentMode:'discovery'}))}});
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
