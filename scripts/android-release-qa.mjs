import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const serial = process.env.QA_ANDROID_SERIAL || 'emulator-5580';
const packageId = process.env.QA_ANDROID_PACKAGE || 'vn.com.nvbtech.reeltara.debug';
const adb = join(process.env.ANDROID_HOME || 'D:/Android/Sdk', 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const command = (...args) => execFileSync(adb, ['-s', serial, ...args], { windowsHide: true, timeout: 30000, maxBuffer: 16 * 1024 * 1024 });
const out = 'docs/qa/release'; mkdirSync(out, { recursive: true });
const results = { checkedAt: new Date().toISOString(), serial, packageId,
  mode: 'Installed bundled APK; real Android WebView and live network; no API/media fixtures',
  apkSha256: process.env.QA_ANDROID_APK ? createHash('sha256').update(readFileSync(process.env.QA_ANDROID_APK)).digest('hex') : null,
  android: command('shell','getprop','ro.build.version.release').toString().trim(), checks: [], screenshots: [], network: [], responses: [], networkErrors: [], playbackEvents: [], errors: [] };
const requests=new Map();
let ws, port, sequence=0;
const pending=new Map();
const cdp=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++sequence;
  pending.set(id,{resolve,reject,timer:setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'));},30000)});
  ws.send(JSON.stringify({id,method,params}));
});
const evaluate=async expression=>{
  const result=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});
  if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const wait=async(expression,timeout=20000)=>{
  const start=Date.now();
  while(Date.now()-start<timeout){if(await evaluate(`Boolean((${expression}))`))return;await new Promise(r=>setTimeout(r,250));}
  throw Error('UI timeout: '+expression);
};
const click=async(name,scope='body',exact=true)=>{
  const expression=`(()=>{const parent=document.querySelector(${JSON.stringify(scope)});const button=[...(parent?.querySelectorAll('button')||[])].find(b=>!b.disabled && b.getClientRects().length && ${exact?'(b.getAttribute("aria-label")||b.textContent.trim()) ===':'(b.getAttribute("aria-label")||b.textContent.trim()).includes('}${JSON.stringify(name)}${exact?'':')'});if(!button)return false;button.click();return true})()`;
  await wait(expression);
};
const shot=async name=>{
  await evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(true))))');
  await new Promise(resolve=>setTimeout(resolve,500)); // Android compositor paints after DOM commit.
  const path=`${out}/${name}.png`;writeFileSync(path,command('exec-out','screencap','-p'));results.screenshots.push(path);
};
const persist=()=>writeFileSync(out+(process.env.QA_SCREENSHOTS_ONLY?'/android-screenshots-qa.json':'/android-qa.json'),JSON.stringify(results,null,2)+'\n');
const check=async(name,fn)=>{
  try{results.checks.push({name,status:'PASS',evidence:await fn()});}
  catch(error){results.checks.push({name,status:'FAIL',error:String(error.message).slice(0,500),state:await evaluate('(()=>{const v=document.querySelector("video");return {text:document.querySelector(".player-screen")?.innerText,video:v?{duration:Number.isFinite(v.duration)?v.duration:null,time:v.currentTime,ready:v.readyState,network:v.networkState,error:v.error?{code:v.error.code,message:v.error.message}:null,source:v.currentSrc}:null,native:window.Capacitor?.isNativePlatform?.(),platform:window.Capacitor?.getPlatform?.()}})()').catch(()=>null)});}
  persist();
};
try{
  command('shell','am','force-stop',packageId);
  command('shell','am','start','-W','-n',packageId+'/vn.com.nvbtech.reeltara.MainActivity');
  for(let i=0;i<30&&!ws;i++){
    const pid=command('shell','pidof',packageId).toString().trim();
    if(pid){
      port=command('forward','tcp:0','localabstract:webview_devtools_remote_'+pid).toString().trim();
      try{
        const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
        const target=targets.find(t=>t.url.startsWith('https://localhost'));
        if(!target)throw Error('No bundled target');
        ws=new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
      }catch{ws?.close();ws=undefined;command('forward','--remove','tcp:'+port);port=undefined;}
    }
    if(!ws)await new Promise(r=>setTimeout(r,500));
  }
  if(!ws)throw Error('No Android WebView target');
  ws.addEventListener('message',event=>{
    const message=JSON.parse(event.data), task=pending.get(message.id);
    if(task){pending.delete(message.id);clearTimeout(task.timer);message.error?task.reject(Error(message.error.message)):task.resolve(message.result);}
    if(message.method==='Runtime.exceptionThrown')results.errors.push(message.params.exceptionDetails.text);
    if(message.method==='Network.requestWillBeSent'){
      const u=new URL(message.params.request.url);
      if(/^https?:$/.test(u.protocol)){const request={host:u.hostname,path:u.pathname,type:message.params.type};results.network.push(request);requests.set(message.params.requestId,request);}
    }
    if(message.method==='Network.responseReceived'&&['Media','Fetch'].includes(message.params.type)){const u=new URL(message.params.response.url);results.responses.push({host:u.hostname,path:u.pathname,type:message.params.type,status:message.params.response.status,mime:message.params.response.mimeType});}
    if(message.method==='Network.loadingFailed')results.networkErrors.push({...requests.get(message.params.requestId),error:message.params.errorText,canceled:message.params.canceled});
    if(message.method==='Runtime.consoleAPICalled'&&message.params.args[0]?.value==='[Free Legal playback]'&&message.params.args[1]?.objectId){void cdp('Runtime.callFunctionOn',{objectId:message.params.args[1].objectId,functionDeclaration:'function(){return JSON.parse(JSON.stringify(this))}',returnByValue:true}).then(r=>results.playbackEvents.push(r.result.value)).catch(()=>{});}
    if(message.method==='Page.javascriptDialogOpening')void cdp('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});
  });
  await cdp('Runtime.enable');await cdp('Network.enable');await cdp('Page.enable');
  await cdp('Page.reload');
  await check('bundled launch and home',async()=>{await wait('!!document.querySelector(".movie-card")');await shot('home-android');return await evaluate('({origin:location.origin,title:document.title,cards:document.querySelectorAll(".movie-card").length})');});
  await check('free catalog and detail',async()=>{
    await click('Free','.bottom-nav');await wait('!!document.querySelector(\'button[aria-label="View Big Buck Bunny"]\')');await shot('free-android');
    if(process.env.QA_SCREENSHOTS_ONLY){await evaluate('document.querySelector(\'button[aria-label="View Big Buck Bunny"]\').scrollIntoView({block:"start"});true');await shot('free-list-android');}
    await click('View Big Buck Bunny');await wait('!!document.querySelector(".detail-page")');await shot('detail-android');return 'Big Buck Bunny detail from reviewed bundled catalog';
  });
  if(!process.env.QA_SCREENSHOTS_ONLY){
  await check('watchlist persistence',async()=>{
    const already=await evaluate('JSON.parse(localStorage.getItem("reeltara-user-v1")||"{}").watchlist?.some(e=>e.movie.id==="bunny")');
    if(!already)await click('My Watchlist','.detail-page');
    const saved=await evaluate('JSON.parse(localStorage.getItem("reeltara-user-v1")||"{}").watchlist?.map(e=>e.movie.id)');
    if(!saved.includes('bunny'))throw Error('Watchlist was not saved');return saved;
  });
  await check('live full film playback and seek',async()=>{
    const action=await evaluate('[...document.querySelectorAll(".detail-page button")].map(b=>b.textContent.trim()).find(t=>["Watch Free","Resume","Watch Again"].includes(t))');
    await click(action,'.detail-page');
    for(let attempt=0;attempt<3;attempt++){
      await wait('!!document.querySelector(".playback-error")||document.querySelector("video")?.readyState>=3',45000);
      if(!await evaluate('!!document.querySelector(".playback-error")'))break;
      if(attempt===2)throw Error('Media still unavailable after two UI retries');
      await click('Retry','.player-screen');results.mediaUiRetries=(results.mediaUiRetries||0)+1;
    }
    await evaluate('(async()=>{const v=document.querySelector("video");v.muted=true;await v.play();return true})()');
    await wait('document.querySelector("video")?.currentTime>1');
    await evaluate('document.querySelector("video").currentTime=35;true');
    await wait('document.querySelector("video")?.currentTime>35.3');await shot('playback-android');
    return await evaluate('(()=>{const v=document.querySelector("video"),r={duration:v.duration,currentTime:v.currentTime,source:v.currentSrc,width:v.videoWidth,height:v.videoHeight,error:v.error?.code||null};v.pause();return r})()');
  });
  if(!process.env.QA_MEDIA_ONLY){
  await check('native fullscreen and Back',async()=>{
    await evaluate('document.querySelector(".trailer-control-rail").dispatchEvent(new PointerEvent("pointermove",{bubbles:true}));true');
    await click('Fullscreen','.player-screen');
    await wait('!!document.fullscreenElement||!!document.querySelector(".trailer-immersive")');
    const mode=await evaluate('document.fullscreenElement?"Fullscreen API":"in-app immersive fallback"');
    command('shell','input','keyevent','4');await wait('!document.fullscreenElement');return mode;
  });
  await check('native Android Back returns from player',async()=>{command('shell','input','keyevent','4');await wait('!!document.querySelector(".detail-page")&&!document.querySelector(".player-screen")');return 'Detail visible after hardware Back';});
  await check('resume saved film progress',async()=>{await click('Resume','.detail-page');await wait('document.querySelector("video")?.currentTime>30',45000);return await evaluate('({currentTime:document.querySelector("video").currentTime,source:document.querySelector("video").currentSrc})');});
  await check('landscape rotation',async()=>{command('shell','settings','put','system','accelerometer_rotation','0');command('shell','settings','put','system','user_rotation','1');await wait('innerWidth>innerHeight');await shot('landscape-android');return await evaluate('({width:innerWidth,height:innerHeight})');});
  command('shell','settings','put','system','user_rotation','0');
  await check('offline bundled launch and saved data',async()=>{
    await cdp('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
    await cdp('Page.reload');await wait('!!document.querySelector(".bottom-nav")');
    const evidence=await evaluate('({online:navigator.onLine,saved:JSON.parse(localStorage.getItem("reeltara-user-v1")||"{}").watchlist?.length})');
    if(evidence.online||!evidence.saved)throw Error('Offline mode or saved data not verified');await shot('offline-android');
    await click('Watchlist','.bottom-nav');await wait('!!document.querySelector(\'button[aria-label="View Big Buck Bunny"]\')');await shot('watchlist-offline-android');
    return {...evidence,method:'DevTools network offline simulation on installed WebView; not a physical Wi-Fi/4G handover'};
  });
  await cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await check('clear local viewing data',async()=>{
    await click('Profile','.bottom-nav');
    const acceptNativeConfirmation=()=>{
      try{
        command('shell','uiautomator','dump','/sdcard/reeltara-qa-ui.xml');
        const xml=command('shell','cat','/sdcard/reeltara-qa-ui.xml').toString();
        if(!xml.includes('Erase local watchlist'))return;
        const button=xml.match(/resource-id="android:id\/button1"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
        if(button)command('shell','input','tap',String(Math.round((+button[1]+ +button[3])/2)),String(Math.round((+button[2]+ +button[4])/2)));
      }catch{}
    };
    const confirmationTimer=setInterval(acceptNativeConfirmation,1000);
    try{await click('Clear local app data','body',false);acceptNativeConfirmation();}finally{clearInterval(confirmationTimer);}
    await wait('(()=>{const d=JSON.parse(localStorage.getItem("reeltara-user-v1")||"{}");return d.watchlist?.length===0&&d.viewed?.length===0&&d.trailers?.length===0&&Object.keys(d.progress||{}).length===0})()');
    await shot('privacy-android');return {watchlist:0,viewed:0,trailers:0,progress:0};
  });
  await check('YouTube trailer embedding or visible official fallback',async()=>{
    await click('Home','.bottom-nav');await click('Explore the story');await wait('!!document.querySelector(".detail-page")');await click('Watch Trailer','.detail-page');
    await wait('!!document.querySelector(".trailer-player iframe")||!!document.querySelector(".playback-error")',30000);
    await wait('!!document.querySelector(".trailer-toggle:not(:disabled)")||!!document.querySelector(".playback-error")',30000);
    if(await evaluate('document.querySelector(".trailer-toggle:not(:disabled)")?.getAttribute("aria-label")==="Play"'))await click('Play','.player-screen');
    await wait('document.querySelector(".trailer-state")?.textContent.includes("Playing")||!!document.querySelector(".playback-error")',30000);
    await shot('trailer-qa-android');
    return await evaluate('({state:document.querySelector(".trailer-state")?.textContent,error:document.querySelector(".playback-error")?.innerText,iframe:document.querySelector(".trailer-player iframe")?.src,officialLinks:[...document.querySelectorAll(".player-screen a")].map(a=>a.href).filter(u=>u.startsWith("https://www.youtube.com/watch"))})');
  });
  await check('official source opens externally',async()=>{
    await click('Back to movie details','.player-screen');
    const link=await evaluate('[...document.querySelectorAll(".detail-page a")].find(a=>a.href.startsWith("https://tv.apple.com/"))?.href');
    if(!link)throw Error('No official provider catalog-search link');
    await evaluate(`(()=>{const a=[...document.querySelectorAll('.detail-page a')].find(a=>a.href===${JSON.stringify(link)});a.click();return true})()`);
    await new Promise(r=>setTimeout(r,1000));
    const activity=command('shell','dumpsys','activity','activities').toString().split('\n').filter(l=>/mResumedActivity|topResumedActivity/.test(l));
    command('shell','input','keyevent','4');
    if(!activity.length||activity.every(line=>line.includes(packageId)))throw Error('External destination did not become the foreground activity');
    return {url:link,activity,note:'Official Apple TV catalog search; not proof of regional availability or a direct entitlement to the movie.'};
  });
  }
  }
}catch(error){results.checks.push({name:'device harness',status:'FAIL',error:String(error.message).slice(0,500)});}
finally{
  if(ws?.readyState===WebSocket.OPEN){await cdp('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1}).catch(()=>{});}
  ws?.close();if(port)command('forward','--remove','tcp:'+port);
  results.completedAt=new Date().toISOString();
  results.status=results.checks.some(c=>c.status==='FAIL')?'FAIL':'PASS';
  results.network=[...new Map(results.network.map(n=>[JSON.stringify(n),n])).values()];persist();
  console.log(JSON.stringify(results,null,2));
}
if(results.checks.some(c=>c.status==='FAIL'))process.exitCode=1;
