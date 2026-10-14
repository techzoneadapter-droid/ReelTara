import {test,expect} from '@playwright/test';
test('licensed cinematic hero loads only its active backdrop and exposes honest editorial sections',async({page})=>{
 const items=Array.from({length:3},(_,i)=>{const base='https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Film'+i+'/';return {id:'commons:'+(78000+i),title:'Licensed Film '+i,overview:'A short original film.',genres:['Animation'],posterUrl:base+'poster.jpg',artwork:{posterUrl:base+'poster.jpg',backdropUrl:base+'backdrop.jpg',sourcePageUrl:'https://commons.wikimedia.org/wiki/File:Film'+i+'.webm',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',licenseType:'CC BY 4.0',attribution:'Creator '+i,licenseVerified:true,checkedAt:new Date().toISOString(),modification:'Resized'},sourceProvider:'Wikimedia Commons',sourcePageUrl:'https://commons.wikimedia.org/wiki/File:Film'+i+'.webm',licenseType:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/',attribution:'Creator '+i,captionTracks:[],playbackCandidates:[],verifiedLegal:true,playable:false};});
 await page.route('**/api/free-catalog**',r=>r.fulfill({json:{items}}));
 await page.route('**/api/open-catalog?**',r=>r.fulfill({json:{items:[{id:'wikidata:Q400000',title:'Metadata Film',year:2026,genre:'Film',poster:'',backdrop:'',cast:[],overview:'',director:''}],hasMore:false}}));
 const backdrops:string[]=[];await page.route('https://thumb.wikimedia.org/**',r=>{if(r.request().url().endsWith('backdrop.jpg'))backdrops.push(r.request().url());return r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="#746047"/></svg>'});});
 await page.goto('/');await expect(page.locator('.hero h1')).toHaveText('Licensed Film 0');
 await expect.poll(()=>page.locator('.hero-art img').evaluate((i:HTMLImageElement)=>i.naturalWidth)).toBe(960);
 expect(backdrops).toHaveLength(1);await expect(page.locator('video,iframe')).toHaveCount(0);
 await page.getByRole('button',{name:'Next featured movie'}).click();await expect(page.locator('.hero h1')).toHaveText('Licensed Film 1');
 await expect.poll(()=>backdrops.length).toBe(2);await expect(page.locator('.hero-art img')).toHaveCount(1);
 for(const name of ['Featured Today','New Releases','Films from India','Films from the Philippines','Series to Explore','Official Trailers'])await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'Trending Now'})).toHaveCount(0);
 await expect(page.locator('.artwork-summary')).toContainText('3 licensed image sources');
 await page.getByRole('button',{name:'Explore Movie',exact:true}).click();await expect(page.locator('.detail-page h1')).toHaveText('Licensed Film 1');
});
