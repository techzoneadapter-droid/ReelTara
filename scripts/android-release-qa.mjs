import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const serial = process.env.QA_ANDROID_SERIAL || 'emulator-5580';
const packageId = process.env.QA_ANDROID_PACKAGE || 'vn.com.nvbtech.reeltara.debug';
const adb = join(process.env.ANDROID_HOME || 'D:/Android/Sdk', 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const command = (...args) => execFileSync(adb, ['-s', serial, ...args], { windowsHide: true, timeout: 30000 });
const out = 'docs/qa/release'; mkdirSync(out, { recursive: true });
const results = { checkedAt: new Date().toISOString(), serial, packageId, mode: 'Installed bundled APK; real Android WebView and live network; no API/media fixtures',
  android: command('shell','getprop','ro.build.version.release').toString().trim(), checks: [], screenshots: [], network: [], errors: [] };
let browser, page, port;
const check = async (name, fn) => {
  try { const evidence = await fn(); results.checks.push({ name, status: 'PASS', evidence }); }
  catch (error) { results.checks.push({ name, status: 'FAIL', error: String(error.message).slice(0,500) }); }
  writeFileSync(out + '/android-qa.json', JSON.stringify(results, null, 2));
};
const shot = name => {
  const path = `${out}/${name}.png`;
  writeFileSync(path, command('exec-out','screencap','-p'));
  results.screenshots.push(path);
};
try {
  command('shell','am','force-stop',packageId);
  command('shell','am','start','-W','-n',packageId + '/vn.com.nvbtech.reeltara.MainActivity');
  for (let i=0; i<30 && !browser; i++) {
    const pid = command('shell','pidof',packageId).toString().trim();
    if (pid) {
      port = command('forward','tcp:0','localabstract:webview_devtools_remote_' + pid).toString().trim();
      try { browser = await chromium.connectOverCDP('http://127.0.0.1:' + port, { timeout: 3000 }); }
      catch { command('forward','--remove','tcp:' + port); port = undefined; }
    }
    if (!browser) await new Promise(r => setTimeout(r,500));
  }
  if (!browser) throw Error('No debuggable Android WebView');
  page = browser.contexts()[0].pages().find(p => p.url().startsWith('https://localhost'));
  if (!page) throw Error('Bundled https://localhost app not found');
  page.on('pageerror', error => results.errors.push(error.message));
  page.on('request', request => { const u = new URL(request.url()); if (/^https?:$/.test(u.protocol)) results.network.push({ host: u.hostname, path: u.pathname, type: request.resourceType() }); });
  page.setDefaultTimeout(20000);
  await check('bundled launch and home', async () => {
    await page.locator('.movie-card').first().waitFor();
    shot('home-android'); return { origin: new URL(page.url()).origin, title: await page.title(), cards: await page.locator('.movie-card').count() };
  });
  await check('free catalog and detail', async () => {
    await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('button',{name:'Free',exact:true}).click();
    await page.getByRole('button',{name:'View Big Buck Bunny',exact:true}).waitFor();
    shot('free-android');
    await page.getByRole('button',{name:'View Big Buck Bunny',exact:true}).click();
    await page.getByRole('button',{name:'Watch Free',exact:true}).waitFor();
    shot('detail-android'); return 'Reviewed Big Buck Bunny detail with Watch Free';
  });
  await check('watchlist persistence', async () => {
    const save = page.getByRole('button',{name:'My Watchlist',exact:true});
    if (await save.count()) await save.click();
    else await page.getByRole('button',{name:/Add to Watchlist|Save to Watchlist|Save movie/}).first().click();
    return await page.evaluate(() => JSON.parse(localStorage.getItem('reeltara-user-v1') || '{}').watchlist?.map(e=>e.movie.id));
  });
  await check('live full film playback and seek', async () => {
    await page.getByRole('button',{name:'Watch Free',exact:true}).click();
    await page.waitForFunction(() => { const v=document.querySelector('video'); return v && v.duration>0 && Number.isFinite(v.duration); }, undefined, { timeout:45000 });
    await page.locator('video').evaluate(async v => { v.muted=true; await v.play(); });
    await page.waitForFunction(() => document.querySelector('video')?.currentTime>1, undefined, { timeout:20000 });
    await page.locator('video').evaluate(v => { v.currentTime=35; });
    await page.waitForFunction(() => document.querySelector('video')?.currentTime>35.3, undefined, { timeout:20000 });
    shot('playback-android');
    const evidence = await page.locator('video').evaluate(v => ({ duration:v.duration, currentTime:v.currentTime, source:v.currentSrc, width:v.videoWidth, height:v.videoHeight, error:v.error?.code || null }));
    await page.locator('video').evaluate(v=>v.pause()); return evidence;
  });
  await check('native Android Back returns from player', async () => {
    command('shell','input','keyevent','4'); await page.locator('.detail-page').waitFor({ state:'visible' }); return 'Detail visible after hardware Back';
  });
  await check('resume saved film progress', async () => {
    await page.getByRole('button',{name:'Resume',exact:true}).click();
    await page.waitForFunction(() => document.querySelector('video')?.currentTime>30, undefined, { timeout:45000 });
    return await page.locator('video').evaluate(v=>({currentTime:v.currentTime,source:v.currentSrc}));
  });
  await check('landscape rotation', async () => {
    command('shell','settings','put','system','accelerometer_rotation','0'); command('shell','settings','put','system','user_rotation','1');
    await page.waitForFunction(()=>innerWidth>innerHeight); shot('landscape-android'); return await page.evaluate(()=>({width:innerWidth,height:innerHeight}));
  });
  command('shell','settings','put','system','user_rotation','0');
  await check('offline bundled launch and saved data', async () => {
    await browser.contexts()[0].setOffline(true); await page.reload();
    await page.locator('.bottom-nav').waitFor();
    const evidence=await page.evaluate(()=>({online:navigator.onLine, saved:JSON.parse(localStorage.getItem('reeltara-user-v1')||'{}').watchlist?.length}));
    if(evidence.online) throw Error('Offline mode was not applied'); shot('offline-android'); return evidence;
  });
  await browser.contexts()[0].setOffline(false);
  await check('clear local viewing data', async () => {
    await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('button',{name:'Profile',exact:true}).click();
    page.once('dialog',dialog=>dialog.accept());
    await page.getByRole('button',{name:'Clear local data',exact:true}).click();
    const data=await page.evaluate(()=>JSON.parse(localStorage.getItem('reeltara-user-v1')||'{}'));
    if(data.watchlist.length || data.viewed.length || data.trailers.length || Object.keys(data.progress).length) throw Error('Personal local data was not erased');
    shot('privacy-android'); return {watchlist:0,viewed:0,trailers:0,progress:0};
  });
} catch(error) {
  results.checks.push({name:'device harness',status:'FAIL',error:String(error.message).slice(0,500)});
} finally {
  results.network=[...new Map(results.network.map(n=>[JSON.stringify(n),n])).values()];
  writeFileSync(out+'/android-qa.json', JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify(results,null,2));
  await browser?.close();
  if(port) command('forward','--remove','tcp:'+port);
}
if(results.checks.some(c=>c.status==='FAIL'))process.exitCode=1;
