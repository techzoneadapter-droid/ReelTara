// Real USB UI QA. Requires npm run android:usb; only this app's WebView is controlled.
import {parseDevices} from './android-usb.mjs';
import { adb, run } from './android-tools.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const output = process.argv.includes('--phase5') ? '.cache/phase5' : '.cache/phase4';
const session = JSON.parse(readFileSync('.cache/android-usb/session.json', 'utf8'));
const devices=parseDevices(await run(adb,['devices','-l'],{capture:true})).filter(d=>d.usb&&d.status==='device');
const device=process.env.ANDROID_SERIAL?devices.find(d=>d.serial===process.env.ANDROID_SERIAL):devices.length===1?devices[0]:undefined;
if (!device) throw new Error('No authorized device');
const cmd = (...args) => run(adb, ['-s', device.serial, ...args], { capture: true });
let port,ws;
try{
mkdirSync(output,{recursive:true});
if(!/^http:\/\/localhost:(518[8-9]|519[0-9])$/.test(session.url))throw Error('Invalid preview URL');
const pid = await cmd('shell', 'pidof', 'com.reeltara.app.debug');
if(!/^\d+$/.test(pid))throw Error('Expected one running ReelTara debug process');
port = await cmd('forward', 'tcp:0', `localabstract:webview_devtools_remote_${pid}`);
const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`,{signal:AbortSignal.timeout(10000)})).json();
const page = pages.find(page => page.url.startsWith(session.url));
if (!page) throw new Error('No preview WebView target');
ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
 const timer=setTimeout(()=>reject(Error('WebView connection timeout')),10000);
 ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});
 ws.addEventListener('error',error=>{clearTimeout(timer);reject(error);},{once:true});
});
let id = 0;
const tasks = new Map();
ws.addEventListener('message', event => { const data = JSON.parse(event.data); if (tasks.has(data.id)) { tasks.get(data.id)(data); tasks.delete(data.id); } });
async function evaluate(expression) {
  const value = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {tasks.delete(ownId);reject(new Error('CDP timeout'));}, 60000);
    const ownId = ++id;
    tasks.set(ownId, data => { clearTimeout(timer); resolve(data); });
    ws.send(JSON.stringify({ id: ownId, method: 'Runtime.evaluate', params: { expression, returnByValue: true, awaitPromise: true } }));
  });
  if (value.error || value.result.exceptionDetails) throw new Error('WebView evaluation failed');
  return value.result.result.value;
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const wait=async expression=>{for(let i=0;i<240;i++){if(await evaluate(expression))return;await delay(250);}throw Error('UI wait failed: '+expression);};
const images=selector=>evaluate('Array.from(document.querySelectorAll('+JSON.stringify(selector)+')).map(i=>({src:i.currentSrc||i.src,width:i.naturalWidth,height:i.naturalHeight,complete:i.complete,kind:i.parentElement.dataset.thumbnailKind}))');
const back=()=>evaluate('document.querySelector(".player-screen button")?.click();[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Back to exploring")?.click();window.scrollTo(0,0);true');
const tab=async label=>{await evaluate('[...document.querySelectorAll("nav button")].find(b=>b.textContent.trim()==='+JSON.stringify(label)+')?.click();window.scrollTo(0,0);true');await delay(300);};
const screenshot=async name=>{
 let bytes;
 try {
  const data=await new Promise((resolve,reject)=>{const ownId=++id;const timer=setTimeout(()=>{tasks.delete(ownId);reject(Error('Screenshot timeout'));},10000);tasks.set(ownId,m=>{clearTimeout(timer);m.result?.data?resolve(m.result.data):reject(Error('WebView screenshot unavailable'));});ws.send(JSON.stringify({id:ownId,method:'Page.captureScreenshot',params:{format:'png'}}));});
  bytes=Buffer.from(data,'base64');
 } catch {
  // Older WebViews can evaluate JavaScript but stall captureScreenshot.
  // Capture the device only while ReelTara itself is the foreground app.
  const windows=await cmd('shell','dumpsys','window');
  if(!windows.split('\n').some(line=>line.includes('mCurrentFocus=')&&line.includes('com.reeltara.app.debug/')))throw Error('ReelTara is not foreground; device screenshot skipped');
  bytes=execFileSync(adb,['-s',device.serial,'exec-out','screencap','-p'],{timeout:15000,maxBuffer:16*1024*1024,windowsHide:true});
  console.log('WebView screenshot unavailable; used foreground ReelTara ADB capture:',name);
 }
 if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Invalid screenshot PNG');
 writeFileSync(output+'/'+name+'.png',bytes);
};
try{
 await evaluate('import("/src/services/http.ts").then(m=>m.clearCache()).then(()=>true)');
 await new Promise((resolve,reject)=>{const ownId=++id;const timer=setTimeout(()=>{tasks.delete(ownId);reject(Error('Page.reload timeout'));},10000);tasks.set(ownId,message=>{clearTimeout(timer);message.error?reject(Error(message.error.message)):resolve();});ws.send(JSON.stringify({id:ownId,method:'Page.reload',params:{}}));});await delay(1500);
 await evaluate('window.__reeltaraQaImageErrors=[];window.__reeltaraQaImageErrorListener=e=>{if(e.target instanceof HTMLImageElement)window.__reeltaraQaImageErrors.push(e.target.currentSrc||e.target.src)};document.addEventListener("error",window.__reeltaraQaImageErrorListener,true);true');
 const seen=new Map();const result={checkedAt:new Date().toISOString(),model:await cmd('shell','getprop','ro.product.model'),android:await cmd('shell','getprop','ro.build.version.release'),url:session.url};
 await tab('Home');await wait('!!document.querySelector(".hero .artwork-credit") && document.querySelector(".hero-art img")?.naturalWidth>0');
 result.coverage=await evaluate('document.querySelector(".artwork-summary")?.textContent');
 result.hero=await images('.hero-art .movie-image > img');await screenshot('home-android');
 await evaluate('[...document.querySelectorAll("button")].find(b=>b.getAttribute("aria-label")==="Next featured movie")?.click();true');await delay(1000);
 await wait('document.querySelector(".hero-art img")?.naturalWidth>0');
 result.nextHero=await images('.hero-art .movie-image > img');
 if(result.hero[0]?.src===result.nextHero[0]?.src)throw Error('Featured hero did not switch');
 if(process.argv.includes('--phase5')){
  result.heroRotation=[...result.hero,...result.nextHero];
  for(let i=0;i<3;i++){
   const previous=result.heroRotation.at(-1).src;
   await evaluate('[...document.querySelectorAll("button")].find(b=>b.getAttribute("aria-label")==="Next featured movie")?.click();true');
   await wait('document.querySelector(".hero-art img")?.naturalWidth>0 && document.querySelector(".hero-art img")?.src.includes("wikimedia.org") && document.querySelector(".hero-art img")?.src!=='+JSON.stringify(previous));
   result.heroRotation.push(...await images('.hero-art .movie-image > img'));
  }
  if(new Set(result.heroRotation.map(i=>i.src)).size!==5||result.heroRotation.some(i=>!i.src.includes('wikimedia.org')))throw Error('All five real featured images must decode');
  result.discover={};await tab('Discover');
  for(const sort of ['featured','country_IN','country_PH']){
   await evaluate('(()=>{const select=document.querySelector("select[aria-label=\\"Sort movies\\"]");select.value='+JSON.stringify(sort)+';select.dispatchEvent(new Event("change",{bubbles:true}));return true})()');
   await wait('document.querySelector("select[aria-label=\\"Sort movies\\"]")?.value==='+JSON.stringify(sort)+' && Number(document.querySelector("[data-catalog-total]")?.dataset.catalogTotal)>0 && ![...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Loading more…")');
   const source=await evaluate('import("/src/services/catalog.ts").then(async ({MovieService})=>{const {UserStateService}=await import("/src/services/userState.ts");const page=await MovieService.pageResult(UserStateService.snapshot().country,1,'+JSON.stringify(sort)+');return {ids:page.movies.map(m=>m.id),titles:page.movies.map(m=>m.title)}})');
   if(!source.ids.length || source.ids.some(id=>! /^(wikidata:Q\d+|tvmaze:\d+)$/.test(id)))throw Error('Discover did not return real open-catalog IDs');
   await wait('(()=>{const titles=[...document.querySelectorAll("[data-catalog-total] .card-title")].map(e=>e.textContent.trim());return titles.length>0&&titles.every(title=>'+JSON.stringify(source.titles)+'.includes(title))})()');
   await delay(500);
   const mounted=await images('[data-catalog-total] .movie-image > img');
   result.discover[sort]={total:await evaluate('Number(document.querySelector("[data-catalog-total]")?.dataset.catalogTotal)'),sourceIds:source.ids,mounted,decoded:mounted.filter(i=>i.width>0).length,placeholders:mounted.filter(i=>i.kind==='placeholder').length};
   await screenshot(sort+'-android');
  }
 }
 await tab('Free');await wait('Number(document.querySelector("[data-catalog-total]")?.dataset.catalogTotal)>=20');
 for(let i=0;i<35;i++){
  const batch=await images('[data-catalog-total] .movie-card .movie-image > img');
  for(const image of batch)if(image.width>0&&image.src.includes('wikimedia.org'))seen.set(image.src,image);
  await evaluate('window.scrollBy(0,450);true');await delay(350);
 }
 result.decodedLicensed=seen.size;result.images=[...seen.values()];
 await evaluate('window.scrollTo(0,0);true');await delay(500);await screenshot('free-android');
 await evaluate('[...document.querySelectorAll("[data-catalog-total] .poster-button")].find(b=>b.querySelector("img")?.src.includes("wikimedia.org"))?.click();true');
 await wait('document.querySelector(".detail-art img")?.naturalWidth>0');
 result.detail=await images('.detail-art .movie-image > img');await screenshot('detail-android');
 await tab('Hot Trailers');await wait('document.querySelector("[data-thumbnail-kind=youtube] img")?.naturalWidth>0');
 result.trailer=await images('[data-thumbnail-kind=youtube] > img');await screenshot('trailers-android');
 result.imageErrors=await evaluate('window.__reeltaraQaImageErrors');
 writeFileSync(output+'/android-artwork.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,images:undefined,discover:result.discover&&Object.fromEntries(Object.entries(result.discover).map(([key,value])=>[key,{...value,mounted:undefined}]))},null,2));
 if(seen.size<20)throw Error('Fewer than 20 licensed images decoded in actual Android UI');
}finally{await evaluate('document.removeEventListener("error",window.__reeltaraQaImageErrorListener,true);delete window.__reeltaraQaImageErrorListener;delete window.__reeltaraQaImageErrors;true').catch(()=>{});await back().catch(()=>{});}
}finally{ws?.close();if(port)await cmd('forward','--remove','tcp:'+port).catch(()=>{});}

