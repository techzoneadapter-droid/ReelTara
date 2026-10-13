import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {adb,run} from './android-tools.mjs';
import {parseDevices} from './android-usb.mjs';
const device=parseDevices(await run(adb,['devices','-l'],{capture:true})).find(d=>d.usb&&d.status==='device');
if(!device)throw new Error('No authorized USB device; real-device QA blocked');
const cmd=(...a)=>run(adb,['-s',device.serial,...a],{capture:true});
const session=JSON.parse(readFileSync('.cache/android-usb/session.json','utf8'));
await cmd('shell','am','force-stop','com.reeltara.app.debug');
const started=Date.now(),launch=await cmd('shell','am','start','-W','-n','com.reeltara.app.debug/com.reeltara.app.MainActivity');
let port,ws;const errors=[];let next=0;const pending=new Map();
try{
 for(let i=0;i<30;i++){
  const pid=await cmd('shell','pidof','com.reeltara.app.debug').catch(()=> '');
  if(pid){port=await cmd('forward','tcp:0','localabstract:webview_devtools_remote_'+pid);try{const pages=await(await fetch('http://localhost:'+port+'/json/list')).json();const target=pages.find(t=>t.url.startsWith(session.url));if(target){ws=new WebSocket(target.webSocketDebuggerUrl);break;}}catch{}
  await cmd('forward','--remove','tcp:'+port);port=undefined;}
  await new Promise(r=>setTimeout(r,500));
 }
 if(!ws)throw new Error('No preview WebView target');
 ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);const t=pending.get(m.id);if(t){pending.delete(m.id);clearTimeout(t.timer);m.error?t.reject(Error(m.error.message)):t.resolve(m.result);}});
 await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject,timer:setTimeout(()=>{pending.delete(id);reject(Error(method+' timeout'));},60000)});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const wait=async expression=>{for(let i=0;i<120;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,250));}throw Error('UI wait timed out: '+expression);};
 await cdp('Runtime.enable');await cdp('Performance.enable');
 await wait('!!document.querySelector("main .movie-card")');
 const uiReadyMs=Date.now()-started;
 const catalog=await evaluate("import('/src/services/catalog.ts').then(async m=>{const c=await m.MovieService.home('IN');return {status:c.status,count:c.movies.filter(x=>x.origin==='open_data').length,titles:c.trending.slice(0,3).map(x=>x.title)}})");
 const navigation=await evaluate(`({navigation:performance.getEntriesByType('navigation')[0]?.toJSON(),paints:performance.getEntriesByType('paint').map(p=>({name:p.name,ms:p.startTime})),resources:performance.getEntriesByType('resource').map(r=>({name:r.name,duration:r.duration,bytes:r.transferSize,decodedBytes:r.decodedBodySize}))})`);
 const tab=async label=>{await evaluate(`window.__qaStart=performance.now(); [...document.querySelectorAll('nav button')].find(b=>b.textContent.trim()===${JSON.stringify(label)})?.click(); true`);await wait('!!document.querySelector("[data-catalog-total]")');return evaluate('performance.now()-window.__qaStart');};
 const deviceMemory=await evaluate('navigator.deviceMemory || null');
 if(process.env.QA_DISABLE_BLUR)await evaluate("(()=>{const s=document.createElement('style');s.textContent='.save-button,.bottom-nav,.hero-label {backdrop-filter:none !important}';document.head.append(s);return true})()");
 const discoverMs=await tab('Discover');
 await wait('Number(document.querySelector("[data-catalog-total]")?.dataset.catalogTotal)>0 && ![...document.querySelectorAll("button")].some(b=>b.textContent.trim()==="Loading…")');
 const pages=[];
 for(let i=0;i<5;i++){
  const b=await evaluate(`({items:Number(document.querySelector('[data-catalog-total]')?.dataset.catalogTotal),mounted:document.querySelectorAll('[data-catalog-total] .movie-card').length,loadMore:!![...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Load more'&&!b.disabled)})`);pages.push(b);
  if(!b.loadMore)break;
  await evaluate("window.__qaCount=Number(document.querySelector('[data-catalog-total]').dataset.catalogTotal);window.__qaLoad=performance.now();[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Load more').click();true");
  await wait("Number(document.querySelector('[data-catalog-total]').dataset.catalogTotal)>window.__qaCount || !!document.querySelector('.load-more [role=status]')");
  pages[pages.length-1].nextPageMs=await evaluate('performance.now()-window.__qaLoad');
 }
 const scroll=await evaluate(`new Promise(resolve=>{const deltas=[];let last=performance.now(),start=last;function frame(now){deltas.push(now-last);last=now;window.scrollBy(0,12);if(now-start<4000)requestAnimationFrame(frame);else{const sorted=[...deltas].sort((a,b)=>a-b);resolve({durationMs:now-start,samples:deltas.length,medianRafIntervalMs:sorted[Math.floor(sorted.length*.5)],p95RafIntervalMs:sorted[Math.floor(sorted.length*.95)],over32ms:deltas.filter(x=>x>32).length,totalDom:document.querySelectorAll('*').length,mountedCards:document.querySelectorAll('[data-catalog-total] .movie-card').length,items:Number(document.querySelector('[data-catalog-total]').dataset.catalogTotal)});}}requestAnimationFrame(frame);})`);
 await evaluate("window.scrollTo(0,0);true");await new Promise(r=>setTimeout(r,300));
 await evaluate("window.__qaDetail=performance.now();document.querySelector('[data-catalog-total] .movie-card button[aria-label^=\"View \"]')?.click();true");
 await wait('!!document.querySelector(".detail-page") && !document.body.innerText.includes("Loading movie details")');
 const detailMs=await evaluate('performance.now()-window.__qaDetail');
 const absentPlayback=await evaluate("({noFullMovieButton:![...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Watch Free'),metadataSource:document.querySelector('.detail-page a[href*=wikidata]')?.href})");
 await evaluate("[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Back to exploring')?.click();true");
 const freeMs=await tab('Free');
 const images=await evaluate("[...document.images].map(i=>({src:i.currentSrc||i.src,width:i.naturalWidth,height:i.naturalHeight,loading:i.loading,failed:!i.naturalWidth&&i.complete}))");
 const metrics=await cdp('Performance.getMetrics');
 const meminfo=await cmd('shell','dumpsys','meminfo','com.reeltara.app.debug');
 const gfxinfo=await cmd('shell','dumpsys','gfxinfo','com.reeltara.app.debug');
 const logcat=await cmd('logcat','-d','-t','300','chromium:E','Capacitor/Console:E','AndroidRuntime:E','*:S');
 const result={checkedAt:new Date().toISOString(),model:await cmd('shell','getprop','ro.product.model'),android:await cmd('shell','getprop','ro.build.version.release'),url:session.url,deviceMemory,mode:'USB Vite development build; cold app process with existing disk/API caches, not release performance',launch,uiReadyMs,catalog,navigation,discoverMs,pages,scroll,detailMs,freeMs,absentPlayback,images,metrics,errors};
 mkdirSync('.cache/phase2',{recursive:true});const tag=process.env.QA_LABEL||'before';writeFileSync('.cache/phase2/'+tag+'.json',JSON.stringify(result,null,2));writeFileSync('.cache/phase2/'+tag+'-meminfo.txt',meminfo);writeFileSync('.cache/phase2/'+tag+'-gfxinfo.txt',gfxinfo);writeFileSync('.cache/phase2/'+tag+'-logcat.txt',logcat);
 console.log(JSON.stringify({...result,navigation:{paints:navigation.paints,resources:navigation.resources.length},images:images.length,metrics:undefined},null,2));
}finally{ws?.close();if(port)await cmd('forward','--remove','tcp:'+port);}
