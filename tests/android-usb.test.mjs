import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { parseDevices, fingerprint } from '../scripts/android-usb.mjs';
import { createServer as createTcpServer, createConnection } from 'node:net';
import { startPreviewServer, previewUrl, reverseMappings } from '../scripts/android-preview-port.mjs';

const listen = (server, port) => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(port, '127.0.0.1', resolve);
});
const close = server => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
function tcpFactory(configurations) {
  return async config => {
    configurations.push(config);
    const socket = createTcpServer();
    return { listen: () => listen(socket, config.server.port), close: () => socket.listening ? close(socket) : Promise.resolve() };
  };
}

test('real Vite skips a busy preview port and leaves its existing service responding', async t => {
  const occupied = createTcpServer(socket => socket.end('existing service'));
  try { await listen(occupied, 5188); } catch (error) {
    if (error.code === 'EADDRINUSE') { t.skip('5188 is already owned by a running application'); return; }
    throw error;
  }
  const readExisting = () => new Promise((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port: 5188 });
    let text = '';
    socket.on('data', data => text += data);
    socket.on('end', () => resolve(text));
    socket.on('error', reject);
  });
  let selected;
  try {
    assert.equal(await readExisting(), 'existing service');
    selected = await startPreviewServer();
    assert(selected.port >= 5189 && selected.port <= 5199);
    assert.equal(selected.server.httpServer.address().port, selected.port);
    assert.equal(selected.server.config.server.hmr.clientPort, selected.port);
    assert.equal(await readExisting(), 'existing service');
  } finally {
    await selected?.server.close();
    await close(occupied);
  }
});

test('busy port is skipped without stopping its listener; Vite and HMR use the selected port', async () => {
  const occupied = createTcpServer();
  await listen(occupied, 0);
  const first = occupied.address().port;
  const configs = [];
  let selected;
  try {
    selected = await startPreviewServer({ first, last: first + 20, factory: tcpFactory(configs) });
    assert(selected.port > first);
    assert(occupied.listening);
    const config = configs.at(-1);
    assert.equal(config.server.port, selected.port);
    assert.equal(config.server.hmr.clientPort, selected.port);
    assert.equal(config.server.strictPort, true);
  } finally {
    await selected?.server.close();
    await close(occupied);
  }
});

test('all ports occupied fails cleanly and keeps the existing server alive', async () => {
  const occupied = createTcpServer();
  await listen(occupied, 0);
  const port = occupied.address().port;
  try {
    await assert.rejects(startPreviewServer({ first: port, last: port, factory: tcpFactory([]) }), /Không có cổng/);
    assert(occupied.listening);
  } finally { await close(occupied); }
});

test('USB ports stay in range and a different selected port invalidates the native config cache', () => {
  assert.equal(previewUrl(5188), 'http://localhost:5188');
  assert.equal(previewUrl(5199), 'http://localhost:5199');
  for (const port of [5173, 5200, 5188.5, '5188']) assert.throws(() => previewUrl(port));
  assert.notEqual(fingerprint(5188), fingerprint(5189));
});

test('reverse mapping parser preserves existing targets so other projects are not rebound', () => {
  assert.deepEqual([...reverseMappings('(reverse) tcp:5188 tcp:3000\nUsbFfs tcp:5189 tcp:5189\n')], [[5188, 'tcp:3000'], [5189, 'tcp:5189']]);
});

test('USB device states remain distinct; emulator and network devices are excluded', () => {
  assert.deepEqual(parseDevices(`List of devices attached\nABC device product:phone model:Pixel\nDEF unauthorized usb:1-2\nemulator-5554 device\n192.168.1.2:5555 offline\n* daemon started successfully *`), [
    { serial: 'ABC', status: 'device', usb: true },
    { serial: 'DEF', status: 'unauthorized', usb: true },
    { serial: 'emulator-5554', status: 'device', usb: false },
    { serial: '192.168.1.2:5555', status: 'offline', usb: false },
  ]);
});
test('React/CSS updates leave the native fingerprint unchanged; native updates invalidate it', () => {
  const web = 'src/__usb-preview-test.css';
  const native = 'android/app/src/debug/__usb-preview-test.txt';
  const before = fingerprint();
  try {
    writeFileSync(web, 'body { color: red; }');
    assert.equal(fingerprint(), before);
    writeFileSync(native, 'native configuration changed');
    assert.notEqual(fingerprint(), before);
  } finally {
    unlinkSync(web);
    unlinkSync(native);
  }
});
test('production configuration has no live server and denies cleartext', () => {
  const config = readFileSync('capacitor.config.ts', 'utf8');
  assert.doesNotMatch(config, /server\s*:|cleartext\s*:\s*true|http:\/\/localhost/);
  const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
  assert.match(manifest, /usesCleartextTraffic="false"/);
  assert.doesNotMatch(manifest, /usb_network_security/);
  const gradle = readFileSync('android/app/usb-preview.gradle', 'utf8');
  assert.match(gradle, /sourceSets\.debug\.assets/);
  assert.doesNotMatch(gradle, /sourceSets\.release/);
});
