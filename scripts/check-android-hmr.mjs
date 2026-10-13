// Integration smoke check against the running USB preview server, without Android.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
const { url: base } = JSON.parse(readFileSync('.cache/android-usb/session.json', 'utf8'));
const path = 'src/__usb-hmr-probe.css';
const messages = [];
let ws;
try {
  writeFileSync(path, 'body { --usb-hmr-probe: 1; }\n');
  const response = await fetch(`${base}/src/__usb-hmr-probe.css?import`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /import\.meta\.hot/);
  const app = await fetch(`${base}/src/App.tsx`);
  assert.equal(app.status, 200);
  assert.match(await app.text(), /\$RefreshReg\$/);
  ws = new WebSocket(base.replace('http:', 'ws:'), 'vite-hmr');
  ws.addEventListener('message', event => messages.push(JSON.parse(event.data)));
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('HMR WebSocket timed out')), 5000);
    ws.addEventListener('open', () => { clearTimeout(timeout); resolve(); }, { once: true });
    ws.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('HMR WebSocket failed')); }, { once: true });
  });
  await new Promise(resolve => setTimeout(resolve, 300));
  writeFileSync(path, 'body { --usb-hmr-probe: 2; }\n');
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline && !messages.some(m => m.type === 'update')) await new Promise(resolve => setTimeout(resolve, 100));
  assert(messages.some(m => m.type === 'update' && m.updates.some(update => update.path.includes('__usb-hmr-probe.css'))));
  assert(!messages.some(m => m.type === 'full-reload'));
  const invalidApi = await fetch(`${base}/api/tmdb?path=account`);
  assert.equal(invalidApi.status, 400);
  console.log('PASS: CSS HMR update without full reload, React Refresh transform, same-origin API backend. Android device is not verified by this check.');
} finally {
  ws?.close();
  unlinkSync(path);
}
