import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) test(`500 discovery titles keep DOM bounded and lazy-load responsive posters (${viewport.width}px)`, async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize(viewport);
  const calls = new Map<string, number>();
  await page.route('**/api/free-catalog**', route => route.fulfill({ json: { items: [] } }));
  await page.route('https://image.tmdb.org/**', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750"><rect width="500" height="750" fill="#182030"/></svg>' }));
  await page.route('**/api/open-catalog?**',route=>{
    const number=Number(new URL(route.request().url()).searchParams.get('page'))||1;
    calls.set(String(number),(calls.get(String(number))||0)+1);
    return route.fulfill({json:{page:number,totalPages:25,hasMore:number<25,items:Array.from({length:20},(_,i)=>({id:'wikidata:Q'+((number-1)*20+i+1),title:'Catalog Film '+((number-1)*20+i+1),year:2026,genre:'Action',rating:0,duration:'Film',certificate:'',poster:'',backdrop:'',overview:'',director:'',cast:[],provider:'',providerUrl:'',origin:'open_data',contentMode:'discovery'}))}});
  });
  await page.goto('/', {waitUntil:'domcontentloaded'});
  const navigation = page.getByRole('navigation', { name: viewport.width < 600 ? 'Mobile navigation' : 'Main navigation' });
  await navigation.getByRole('button', { name: 'Discover', exact: true }).click();
  await expect(page.locator('[data-catalog-total]')).toHaveAttribute('data-catalog-total', '20');
  for (let number = 2; number <= 25; number++) {
    await page.getByRole('button', { name: 'Load more', exact: true }).click();
    await expect(page.locator('[data-catalog-total]')).toHaveAttribute('data-catalog-total', String(number * 20));
  }
  await expect(page.getByRole('button', { name: 'Load more', exact: true })).toHaveCount(0);
  await expect(page.getByText('500 stories to discover')).toBeVisible();
  const grid = page.locator('[data-catalog-total]');
  expect(await grid.locator('.movie-card').count()).toBeLessThan(80);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.getByRole('button', { name: 'View Catalog Film 500', exact: true })).toBeVisible();
  expect(await grid.locator('.movie-card').count()).toBeLessThan(80);
  expect(calls.get('1')).toBeLessThanOrEqual(3);
  expect(calls.get('25')).toBe(1);
  await expect(grid.locator('img[src^="https://"]')).toHaveCount(0); // Unverified open-data images are withheld.
  console.log('CATALOG_PERFORMANCE_FIXTURE', { total: 500, mountedCards: await grid.locator('.movie-card').count(), viewport: viewport.width, pagesRequested: 25, lastPageReached: true });
});

test('Hot Trailers remains a reviewed registry, independent of open discovery metadata',async({page})=>{
 await page.route('**/api/free-catalog**',r=>r.fulfill({json:{items:[]}}));await page.route('**/api/open-catalog?**',r=>r.fulfill({json:{items:[],hasMore:false}}));await page.goto('/', {waitUntil:'domcontentloaded'});await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Hot Trailers',exact:true}).click();await expect(page.getByRole('button',{name:'View Dune: Part Two',exact:true})).toBeVisible();
});
