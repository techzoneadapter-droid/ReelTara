import { withAndroidBuildLock } from './android-build-lock.mjs';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { adb, cap, gradle, run, root } from './android-tools.mjs';
import { firstPreviewPort, previewUrl, startPreviewServer, reverseMappings } from './android-preview-port.mjs';

const app = 'com.reeltara.app.debug';
let port = firstPreviewPort;
const apk = join(root, 'android/app/build/outputs/apk/debug/app-debug.apk');
const stampPath = '.cache/android-usb/state.json';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let server;
let stopped = false;
let state = {};
try { state = JSON.parse(readFileSync(stampPath, 'utf8')); } catch { /* First run. */ }
function save() { mkdirSync('.cache/android-usb', { recursive: true }); writeFileSync(stampPath, JSON.stringify(state)); }

export function parseDevices(output) {
  return output.split(/\r?\n/).map(line => line.trim().split(/\s+/)).filter(([serial, status]) => serial && ['device', 'unauthorized', 'offline'].includes(status)).map(([serial, status, ...info]) => ({ serial, status, usb: info.some(x => x.startsWith('usb:')) || (!serial.startsWith('emulator-') && !serial.includes(':')) }));
}
export function fingerprint(previewPort = firstPreviewPort) {
  const hash = createHash('sha256');
  hash.update(previewUrl(previewPort));
  const skip = new Set(['build', '.gradle', '.idea', 'public']);
  const walk = path => {
    if (!existsSync(path)) return;
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (skip.has(entry.name) || ['local.properties', 'capacitor.config.json'].includes(entry.name)) continue;
      const file = join(path, entry.name);
      if (entry.isDirectory()) walk(file);
      else { hash.update(relative(root, file)); hash.update(readFileSync(file)); }
    }
  };
  walk('android');
  hash.update(readFileSync('capacitor.config.ts'));
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  for (const [path, pkg] of Object.entries(lock.packages || {}).sort()) {
    const manifest = join(path, 'package.json');
    if (path.includes('@capacitor/') || (existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).capacitor)) {
      hash.update(path + pkg.version + (pkg.integrity || ''));
      walk(join(path, 'android'));
      if (path.endsWith('@capacitor/android')) walk(join(path, 'capacitor'));
    }
  }
  return hash.digest('hex');
}
async function devices() {
  const all = parseDevices(await run(adb, ['devices', '-l'], { capture: true })).filter(d => d.usb);
  const wanted = process.env.ANDROID_SERIAL;
  const selected = wanted ? all.filter(d => d.serial === wanted) : all;
  if (selected.length > 1) throw new Error('Nhiều thiết bị USB. Đặt ANDROID_SERIAL để chọn một thiết bị.');
  if (selected[0]?.status === 'unauthorized') throw new Error('Mở khóa Android và xác nhận “Allow USB debugging”, rồi chạy lại npm run android:usb.');
  return selected[0]?.status === 'device' ? selected[0] : undefined;
}
export async function buildDebug(previewPort = firstPreviewPort) {
  return withAndroidBuildLock(() => buildDebugUnlocked(previewPort));
}
async function buildDebugUnlocked(previewPort = firstPreviewPort) {
  // A build-only preparation may have completed while this process waited USB.
  try { state = JSON.parse(readFileSync(stampPath, 'utf8')); } catch { /* Keep in-memory state. */ }
  let hash = fingerprint(previewPort);
  const apkHash = existsSync(apk) ? createHash('sha256').update(readFileSync(apk)).digest('hex') : undefined;
  if (!apkHash || state.build !== hash || state.apk !== apkHash) {
    console.log('[Native] Đồng bộ và build debug APK (không build lại khi sửa React/CSS).');
    await run(process.execPath, ['node_modules/typescript/bin/tsc', '-b']);
    await run(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], { extraEnv: { VITE_PUBLIC_API_BASE_URL: '' } });
    await cap('sync', 'android');
    await gradle('assembleDebug', '--console=plain', `-PusbPreviewPort=${previewPort}`);
    hash = fingerprint(previewPort);
    state.build = hash;
    state.apk = createHash('sha256').update(readFileSync(apk)).digest('hex');
    save();
  } else {
    console.log('[Native] APK debug cache hợp lệ; bỏ qua build và sync.');
  }
  return hash;
}
async function mappingsFor(device) {
  return reverseMappings(await run(adb, ['-s', device.serial, 'reverse', '--list'], { capture: true }));
}
function excludedMappings(mappings) {
  return new Set([...mappings].filter(([remote, local]) => local !== `tcp:${remote}`).map(([remote]) => remote));
}
function saveSession() {
  mkdirSync('.cache/android-usb', { recursive: true });
  writeFileSync('.cache/android-usb/session.json', JSON.stringify({ pid: process.pid, port, url: previewUrl(port) }));
}
async function forward(device) {
  const mappings = await mappingsFor(device);
  if (mappings.has(port)) {
    if (mappings.get(port) !== `tcp:${port}`) throw new Error(`ADB reverse tcp:${port} thuộc ánh xạ khác; không ghi đè.`);
    return;
  }
  await run(adb, ['-s', device.serial, 'reverse', '--no-rebind', `tcp:${port}`, `tcp:${port}`], { capture: true });
}
async function connect(device) {
  const cmd = (...args) => run(adb, ['-s', device.serial, ...args], { capture: true });
  const api = Number(await cmd('shell', 'getprop', 'ro.build.version.sdk'));
  if (api < 23) throw new Error(`Android API ${api} thấp hơn minSdk 23.`);
  console.log(`[USB] ${device.serial}, Android API ${api}`);
  const mappings = await mappingsFor(device);
  if (mappings.has(port) && mappings.get(port) !== `tcp:${port}`) {
    const previous = server;
    ({ server, port } = await startPreviewServer({ excluded: excludedMappings(mappings) }));
    await previous.close();
    saveSession();
    console.log(`[Vite] ${previewUrl(port)}; tránh ánh xạ USB đang được sử dụng.`);
  }
  await forward(device);
  const hash = await buildDebug(port);
  // Android versions differ: pm path may exit 1 when the package is absent.
  const installed = await cmd('shell', 'pm', 'path', app).catch(() => '');
  const info = installed.includes('package:') ? await cmd('shell', 'dumpsys', 'package', app) : '';
  const update = info.match(/lastUpdateTime=([^\r\n]+)/)?.[1];
  const cached = state[device.serial];
  if (!installed.includes('package:') || cached?.apk !== state.apk || cached?.update !== update) {
    console.log('[Install] Cài ReelTara debug; xác nhận trên điện thoại nếu Android yêu cầu.');
    await cmd('install', '-r', apk);
    const infoAfter = await cmd('shell', 'dumpsys', 'package', app);
    state[device.serial] = { apk: state.apk, update: infoAfter.match(/lastUpdateTime=([^\r\n]+)/)?.[1] };
    save();
  }
  await cmd('shell', 'am', 'force-stop', app);
  const launch = await cmd('shell', 'am', 'start', '-n', `${app}/com.reeltara.app.MainActivity`);
  if (/Error:|Exception/.test(launch)) throw new Error(launch);
  console.log(launch);
  console.log('[Ready] Vite HMR/Fast Refresh đang phục vụ qua USB. Ctrl+C để dừng.');
  return hash;
}
async function main() {
  if (process.argv.includes('--build-only')) { await buildDebug(); return; }
  await run(adb, ['version'], { capture: true }).catch(error => {
    throw new Error(`Không chạy được ADB. Kiểm tra ANDROID_HOME và SDK Platform Tools.\n${error.message}`);
  });
  await run(adb, ['start-server'], { capture: true });
  const initial = await devices(); // Authorization errors before starting Vite.
  const excluded = initial ? excludedMappings(await mappingsFor(initial)) : new Set();
  ({ server, port } = await startPreviewServer({ excluded }));
  saveSession();
  console.log(`[Vite] http://localhost:${port}; API chạy trên backend Vite của laptop.`);
  if (!initial) console.log('[USB] Chưa có thiết bị. Cắm USB, bật USB debugging và mở khóa Android. Đang chờ…');
  let active;
  let nativeHash;
  let lastError;
  while (!stopped) {
    try {
      const device = await devices();
      if (!device) {
        if (active) console.log('[USB] Mất kết nối. Đang chờ cắm lại…');
        active = undefined;
      } else if (active !== device.serial || fingerprint(port) !== nativeHash) {
        nativeHash = await connect(device);
        active = device.serial;
      } else {
        // Restore forwarding even if ADB was restarted while USB stayed connected.
        const mappings = await mappingsFor(device);
        if (mappings.has(port) && mappings.get(port) !== `tcp:${port}`) {
          nativeHash = await connect(device);
        } else await forward(device);
      }
      lastError = undefined;
    } catch (error) {
      if (error.message.includes('Allow USB debugging')) throw error;
      // A connected device with a build/install failure needs attention; avoid
      // continuously repeating Gradle or an OS-blocked installation.
      if (await devices().catch(() => undefined)) {
        throw new Error(`${error.message}\nNếu Android chặn cài APK, xác nhận cài qua USB trên thiết bị rồi chạy lại.`);
      }
      if (lastError !== error.message) console.error('[USB]', error.message);
      lastError = error.message;
      active = undefined;
    }
    await delay(3000);
  }
}
async function cleanup() { stopped = true; await server?.close(); }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.on('SIGINT', () => { void cleanup().then(() => process.exit(0)); });
  process.on('SIGTERM', () => { void cleanup().then(() => process.exit(0)); });
  main().catch(async error => { console.error('[ERROR]', error.message); await cleanup(); process.exitCode = 1; });
}
