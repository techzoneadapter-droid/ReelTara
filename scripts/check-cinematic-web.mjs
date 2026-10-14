import {chromium} from '@playwright/test';import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const {url}=JSON.parse(readFileSync('.cache/android-usb/session.json','utf8'));
if(!/^http:\/\/localhost:(518[8-9]|519[0-9])$/.test(url))throw Error('Expected ReelTara development preview URL');
const b=await chromium.launch({executablePath:existsSync('C:/Program Files/Google/Chrome/Application/chrome.exe')?'C:/Program Files/Google/Chrome/Application/chrome.exe':'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const seen=new Map();const discovery={};
try{
 const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 p.setDefaultTimeout(60000);
 await p.addInitScript(()=>{window.__reeltaraQaImageErrors=[];document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement)window.__reeltaraQaImageErrors.push(e.target.currentSrc||e.target.src)},true)});await p.goto(url);await p.waitForFunction(()=>document.querySelector('.hero .artwork-credit'));
 await p.waitForFunction(()=>document.querySelector('.hero-art img')?.naturalWidth>0);
 mkdirSync('.cache/phase5',{recursive:true});await p.screenshot({path:'.cache/phase5/home-desktop.png',fullPage:true});
 const coverage=await p.locator('.artwork-summary').textContent();const hero=await p.locator('.hero-art img').evaluate(i=>({url:i.currentSrc,width:i.naturalWidth,height:i.naturalHeight}));
 const heroRotation=[hero];
 for(let i=0;i<4;i++){
  const previous=heroRotation.at(-1).url;
  await p.getByRole('button',{name:'Next featured movie',exact:true}).click();
  await p.waitForFunction(previous=>{const image=document.querySelector('.hero-art img');return image?.naturalWidth>0&&image.src.includes('wikimedia.org')&&image.src!==previous},previous);
  heroRotation.push(await p.locator('.hero-art img').evaluate(i=>({url:i.currentSrc,width:i.naturalWidth,height:i.naturalHeight})));
 }
 if(new Set(heroRotation.map(i=>i.url)).size!==5)throw Error('All five featured images must decode');
 await p.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Discover',exact:true}).click();
 for(const sort of ['featured','country_IN','country_PH']){
  await p.getByLabel('Sort movies').selectOption(sort);
  const source=await p.evaluate(async sort=>{const {MovieService}=await import('/src/services/catalog.ts');const {UserStateService}=await import('/src/services/userState.ts');const page=await MovieService.pageResult(UserStateService.snapshot().country,1,sort);return {ids:page.movies.map(m=>m.id),titles:page.movies.map(m=>m.title)}},sort);
  if(!source.ids.length||source.ids.some(id=>! /^(wikidata:Q\d+|tvmaze:\d+)$/.test(id)))throw Error('No real discovery records');
  await p.waitForFunction(titles=>{const cards=[...document.querySelectorAll('[data-catalog-total] .card-title')];return cards.length>0&&cards.every(card=>titles.includes(card.textContent.trim()))},source.titles);
  await p.waitForTimeout(500);
  discovery[sort]=await p.locator('[data-catalog-total]').evaluate(grid=>({total:Number(grid.dataset.catalogTotal),mounted:grid.querySelectorAll('.movie-card').length,placeholders:grid.querySelectorAll('[data-thumbnail-kind=placeholder]').length}));
  discovery[sort].sourceIds=source.ids;
  await p.screenshot({path:'.cache/phase5/'+sort+'-web.png'});
 }
 await p.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Free to Watch',exact:true}).click();
 await p.locator('[data-catalog-total] .movie-card').first().waitFor();
 for(let i=0;i<35;i++){
  await p.waitForTimeout(250);
  for(const image of await p.locator('[data-catalog-total] .movie-card .movie-image > img').evaluateAll(images=>images.filter(i=>i.complete&&i.naturalWidth>0).map(i=>({url:i.currentSrc,width:i.naturalWidth,title:i.closest('.movie-card').querySelector('.poster-button').getAttribute('aria-label')}))))if(image.url.includes('wikimedia.org'))seen.set(image.url,image);
  await p.evaluate(()=>window.scrollBy(0,350));
 }
 await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(500);await p.screenshot({path:'.cache/phase5/free-desktop.png'});
 await p.locator('[data-catalog-total] .movie-card .poster-button').filter({has:p.locator('img[src*="wikimedia.org"]')}).first().click();
 await p.waitForFunction(()=>document.querySelector('.detail-art img')?.naturalWidth>0);await p.screenshot({path:'.cache/phase5/detail-desktop.png'});
 await p.getByRole('button',{name:'Back to exploring',exact:true}).click();
 await p.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Hot Trailers',exact:true}).click();
 await p.waitForFunction(()=>document.querySelector('[data-thumbnail-kind="youtube"] img')?.naturalWidth>0);await p.screenshot({path:'.cache/phase5/trailers-desktop.png'});
 await p.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Home',exact:true}).click();await p.setViewportSize({width:390,height:844});await p.screenshot({path:'.cache/phase5/home-mobile.png',fullPage:true});
 const result={checkedAt:new Date().toISOString(),hero,heroRotation,coverage,discovery,imageErrors:await p.evaluate(()=>window.__reeltaraQaImageErrors),decodedLicensed:seen.size,images:[...seen.values()],errors};writeFileSync('.cache/phase5/web-artwork.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,images:undefined}));if(seen.size<20||errors.length)throw Error('Insufficient actual UI decoded images or runtime exceptions');
}finally{await b.close();}
