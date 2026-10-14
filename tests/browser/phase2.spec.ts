import {test,expect} from '@playwright/test';
const item=(title:string)=>({id:'wikidata:Q101',title,year:2026,genre:'Film',rating:0,duration:'Film',certificate:'',poster:'',backdrop:'',overview:'',director:'',cast:[],provider:'',providerUrl:'https://www.wikidata.org/wiki/Q101',origin:'open_data',contentMode:'discovery'});
test('offline metadata stays bounded and labelled; reconnect refreshes real catalog without clearing user state',async({page,context})=>{
 let calls=0, generation='Cached title';
 await page.route('**/api/free-catalog**',r=>r.fulfill({json:{items:[]}}));
 await page.route('**/api/open-catalog?**',r=>{calls++;return r.fulfill({json:{items:[item(generation)],hasMore:false,totalPages:1}});});
 await page.goto('/',{waitUntil:'domcontentloaded'});await expect(page.getByRole('heading',{name:'Cached title',exact:true})).toBeVisible();
 await page.evaluate(async()=>{
  // @ts-ignore Vite test imports the real service module.
  const m=await import('/src/services/catalog.ts');window.__qaCatalog=m.MovieService;
  window.__qaClock=Date.now;Date.now=()=>window.__qaClock()+16*60000;
  localStorage.setItem('phase2-user-sentinel','preserved');
 });
 const before=calls;await context.setOffline(true);
 const cached=await page.evaluate(async()=>{window.__qaCatalog.retry();const c=await window.__qaCatalog.home('IN');return {status:c.status,message:c.message,title:c.trending[0].title};});
 expect(cached.status).toBe('fallback');expect(cached.message).toContain('Offline');expect(cached.title).toBe('Cached title');expect(calls).toBe(before);
 generation='Fresh title';await context.setOffline(false);
 const fresh=await page.evaluate(async()=>{window.__qaCatalog.retry();const c=await window.__qaCatalog.home('IN');Date.now=window.__qaClock;return {status:c.status,title:c.trending[0].title,sentinel:localStorage.getItem('phase2-user-sentinel')};});
 expect(fresh.status).toBe('live');expect(fresh.title).toBe('Fresh title');expect(fresh.sentinel).toBe('preserved');expect(calls).toBeGreaterThan(before);
});
test('low-memory Android avoids expensive blur and failed posters retain the existing fallback',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'deviceMemory',{get:()=>2});Object.defineProperty(navigator,'userAgent',{get:()=> 'Mozilla/5.0 Android QA'});});
 await page.route('**/api/open-catalog?**',r=>r.fulfill({status:503,json:{}}));await page.route('**/api/free-catalog**',r=>r.fulfill({json:{items:[]}}));await page.route('**/images/**',r=>r.fulfill({status:404,body:''}));
 await page.route('https://i.ytimg.com/**',r=>r.fulfill({status:404,body:''}));
 await page.goto('/',{waitUntil:'domcontentloaded'});await expect(page.locator('html')).toHaveAttribute('data-low-memory-android','true');
 await expect(page.locator('.movie-card .image-fallback').first()).toBeVisible();
 expect(await page.locator('.save-button').first().evaluate(e=>getComputedStyle(e).backdropFilter)).toBe('none');
});
declare global {interface Window {__qaCatalog:any;__qaClock:()=>number}}
