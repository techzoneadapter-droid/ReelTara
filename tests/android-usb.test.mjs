import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { parseDevices, fingerprint } from '../scripts/android-usb.mjs';

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
