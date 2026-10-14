import {test,expect} from '@playwright/test';
test('slow external font stylesheet does not block the first usable app screen',async({page})=>{
 await page.route('https://fonts.googleapis.com/**',async route=>{await new Promise(r=>setTimeout(r,8000));if(!page.isClosed())await route.fulfill({contentType:'text/css',body:''}).catch(()=>{});});
 await page.route('**/api/open-catalog?**',r=>r.fulfill({status:503,json:{}}));
 await page.route('**/api/free-catalog**',r=>r.fulfill({json:{items:[]}}));
 await page.goto('/',{waitUntil:'domcontentloaded',timeout:5000});
 await expect(page.getByRole('navigation',{name:'Main navigation'})).toBeVisible();
 await expect(page.locator('.hero h1')).toBeVisible();
});
