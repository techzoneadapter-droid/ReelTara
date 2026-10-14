// Real USB UI QA. Requires npm run android:usb; only this app's WebView is controlled.
import {parseDevices} from './android-usb.mjs';
import { adb, run } from './android-tools.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const session = JSON.parse(readFileSync('.cache/android-usb/session.json', 'utf8'));
const devices=parseDevices(await run(adb,['devices','-l'],{capture:true})).filter(d=>d.usb&&d.status==='device');
const device=process.env.ANDROID_SERIAL?devices.find(d=>d.serial===process.env.ANDROID_SERIAL):devices.length===1?devices[0]:undefined;
if (!device) throw new Error('No authorized device');
const cmd = (...args) => run(adb, ['-s', device.serial, ...args], { capture: true });
let port,ws;
try{
mkdirSync('.cache/phase4',{recursive:true});
if(!/^http:\/\/localhost:(518[8-9]|519[0-9])$/.test(session.url))throw Error('Invalid preview URL');
const pid = await cmd('shell', 'pidof', 'com.reeltara.app.debug');
port = await cmd('forward', 'tcp:0', `localabstract:webview_devtools_remote_${pid}`);
const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = pages.find(page => page.url.startsWith(session.url));
if (!page) throw new Error('No preview WebView target');
ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
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
const wait=async expression=>{for(let i=0;i<120;i++){if(await evaluate(expression))return;await delay(250);}throw Error('UI wait failed: '+expression);};
const images=selector=>evaluate('Array.from(document.querySelectorAll('+JSON.stringify(selector)+')).map(i=>({src:i.currentSrc||i.src,width:i.naturalWidth,height:i.naturalHeight,complete:i.complete,kind:i.parentElement.dataset.thumbnailKind}))');
const back=()=>evaluate('document.querySelector(".player-screen button")?.click();[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Back to exploring")?.click();window.scrollTo(0,0);true');
const tab=async label=>{await evaluate('[...document.querySelectorAll("nav button")].find(b=>b.textContent.trim()==='+JSON.stringify(label)+')?.click();window.scrollTo(0,0);true');await delay(300);};
const screenshot=async name=>{
 const data=await new Promise((resolve,reject)=>{const ownId=++id;const timer=setTimeout(()=>{tasks.delete(ownId);reject(Error('Screenshot timeout'));},30000);tasks.set(ownId,m=>{clearTimeout(timer);m.result?.data?resolve(m.result.data):reject(Error('WebView screenshot unavailable'));});ws.send(JSON.stringify({id:ownId,method:'Page.captureScreenshot',params:{format:'png'}}));});
 writeFileSync('.cache/phase4/'+name+'.png',Buffer.from(data,'base64'));
};
try{
 await evaluate('import("/src/services/http.ts").then(m=>m.clearCache()).then(()=>true)');
 await new Promise(resolve=>{const ownId=++id;tasks.set(ownId,resolve);ws.send(JSON.stringify({id:ownId,method:'Page.reload',params:{}}));});await delay(1500);
 const seen=new Map();const result={checkedAt:new Date().toISOString(),model:await cmd('shell','getprop','ro.product.model'),android:await cmd('shell','getprop','ro.build.version.release'),url:session.url};
 await tab('Home');await wait('!!document.querySelector(".hero .artwork-credit") && document.querySelector(".hero-art img")?.naturalWidth>0');
 result.coverage=await evaluate('document.querySelector(".artwork-summary")?.textContent');
 result.hero=await images('.hero-art .movie-image > img');await screenshot('home-android');
 await evaluate('[...document.querySelectorAll("button")].find(b=>b.getAttribute("aria-label")==="Next featured movie")?.click();true');await delay(1000);
 result.nextHero=await images('.hero-art .movie-image > img');
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
 writeFileSync('.cache/phase4/android-artwork.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,images:undefined},null,2));
 if(seen.size<20)throw Error('Fewer than 20 licensed images decoded in actual Android UI');
}finally{await back().catch(()=>{});}
}finally{ws?.close();if(port)await cmd('forward','--remove','tcp:'+port).catch(()=>{});}

