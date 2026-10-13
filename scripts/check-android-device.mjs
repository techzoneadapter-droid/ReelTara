// Requires an authorized device and npm run android:usb in another terminal.
// Checks the app's own debug WebView through CDP; probes leave no UI changes.
import assert from 'node:assert/strict';
import { readFileSync, appendFileSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { adb, run } from './android-tools.mjs';
import { fingerprint, parseDevices } from './android-usb.mjs';

const devices = parseDevices(await run(adb, ['devices', '-l'], { capture: true })).filter(d => d.usb && d.status === 'device');
const device = process.env.ANDROID_SERIAL ? devices.find(d => d.serial === process.env.ANDROID_SERIAL) : devices.length === 1 ? devices[0] : undefined;
assert(device, 'Select one authorized USB device with ANDROID_SERIAL');
const cmd = (...args) => run(adb, ['-s', device.serial, ...args], { capture: true });
const pid = (await cmd('shell', 'pidof', 'com.reeltara.app.debug')).trim();
assert(/^\d+$/.test(pid), 'ReelTara debug is not running');
await cmd('forward', 'tcp:9223', `localabstract:webview_devtools_remote_${pid}`);
const targets = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const target = targets.find(t => t.url === 'http://localhost:5173/');
assert(target, 'No ReelTara Live Reload target found');
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  const task = pending.get(message.id);
  if (task) { pending.delete(message.id); message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result); }
});
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});
function cdp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`${method} timed out`)); }, 10000);
    pending.set(requestId, { resolve: result => { clearTimeout(timer); resolve(result); }, reject: error => { clearTimeout(timer); reject(error); } });
    ws.send(JSON.stringify({ id: requestId, method, params }));
  });
}
async function evaluate(expression) {
  const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function waitFor(expression) {
  const until = Date.now() + 15000;
  while (Date.now() < until) { if (await evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 200)); }
  throw new Error(`Device HMR probe timed out: ${expression}`);
}
const suffixes = new Map();
const append = (path, text) => { suffixes.set(path, text); appendFileSync(path, text); };
const apk = 'android/app/build/outputs/apk/debug/app-debug.apk';
const before = { hash: fingerprint(), apkMtime: statSync(apk).mtimeMs };
try {
  await cdp('Runtime.enable');
  const initial = await evaluate(`({title: document.title, text: document.body.innerText.slice(0, 250), timeOrigin: performance.timeOrigin, url: location.href, ua: navigator.userAgent})`);
  assert(initial.text.includes('ReelTara') || initial.title.includes('ReelTara'));
  await evaluate(`(async () => { window.__usbProbeEvents = []; const client = await import('/@vite/client'); const hot = client.createHotContext('/__usb-validation'); window.__usbProbeHot = hot; window.__usbProbeListener = data => window.__usbProbeEvents?.push(data); hot.on('vite:afterUpdate', window.__usbProbeListener); return true; })()`);
  append('src/styles.css', '\n/* USB preview verification: removed after test */\n:root { --usb-preview-probe: verified; }\n');
  await waitFor(`getComputedStyle(document.documentElement).getPropertyValue('--usb-preview-probe').trim() === 'verified'`);
  assert.equal(await evaluate('performance.timeOrigin'), initial.timeOrigin, 'CSS change reloaded the WebView');
  append('src/App.tsx', '\n// USB React Refresh verification: removed after test\n');
  await waitFor(`window.__usbProbeEvents.some(event => event.updates?.some(update => update.path === '/src/App.tsx'))`);
  assert.equal(await evaluate('performance.timeOrigin'), initial.timeOrigin, 'React change reloaded the WebView');
  assert.equal(fingerprint(), before.hash, 'Web changes triggered native fingerprint');
  assert.equal(statSync(apk).mtimeMs, before.apkMtime, 'APK was rebuilt for web changes');
  assert.deepEqual(errors, []);
  const result = { checkedAt: new Date().toISOString(), model: await cmd('shell', 'getprop', 'ro.product.model'), android: await cmd('shell', 'getprop', 'ro.build.version.release'), api: await cmd('shell', 'getprop', 'ro.build.version.sdk'), url: initial.url, userAgent: initial.ua, cssHmr: true, reactRefresh: true, fullReload: false, apkRebuilt: false, runtimeErrorsDuringProbe: errors };
  mkdirSync('.cache/android-usb', { recursive: true });
  writeFileSync('.cache/android-usb/device-verification.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  try { await evaluate(`window.__usbProbeHot?.off('vite:afterUpdate', window.__usbProbeListener); delete window.__usbProbeHot; delete window.__usbProbeListener; delete window.__usbProbeEvents; true`); } catch { /* Device may have disconnected. */ }
  for (const [path, text] of suffixes) {
    const current = readFileSync(path, 'utf8');
    // Preserve any unrelated concurrent edits, removing just our probe.
    writeFileSync(path, current.replace(text, ''));
  }
  ws.close();
  await cmd('forward', '--remove', 'tcp:9223');
}
