import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

// Screenshots of real streamed frames, for editorial review; not store screenshots.
const sources = JSON.parse(readFileSync('src/data/freeSources.json', 'utf8'));
const out = 'docs/qa/release/credits';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.platform === 'win32' ? { channel: 'msedge' } : {});
const results = { checkedAt: new Date().toISOString(), purpose: 'File identity and end-credit inspection; transport alone does not establish licensing.', files: [] };
try {
  for (const [id, source] of Object.entries(sources)) {
    for (const [index, url] of [source.playbackUrl, ...source.fallbackPlaybackUrls].entries()) {
      const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
      const result = { id, index, url, frames: [] };
      try {
        await page.setContent('<body style="margin:0;background:#000"><video muted controls style="width:960px;height:540px"></video></body>');
        await page.locator('video').evaluate((video, src) => { video.src = src; video.load(); }, url);
        await page.waitForFunction(() => Number.isFinite(document.querySelector('video').duration), null, { timeout: 60000 });
        result.duration = await page.locator('video').evaluate(v => v.duration);
        for (const offset of [60, 15]) {
          await page.locator('video').evaluate((v, seconds) => new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(Error('Credit seek timed out')), 45000);
            v.addEventListener('seeked', () => { clearTimeout(timer); resolve(); }, { once: true });
            v.currentTime = Math.max(0, v.duration - seconds);
          }), offset);
          const path = `${out}/${id}-${index}-end-${offset}.png`;
          await page.locator('video').screenshot({ path });
          result.frames.push({ path, time: await page.locator('video').evaluate(v => v.currentTime) });
        }
        result.status = 'FRAMES_CAPTURED_FOR_REVIEW';
      } catch (error) { result.status = 'FAIL'; result.error = String(error.message).slice(0, 300); }
      finally { await page.close(); results.files.push(result); writeFileSync(out + '/credit-audit.json', JSON.stringify(results, null, 2) + '\n'); }
      console.log(JSON.stringify({ id, index, status: result.status, duration: result.duration }));
    }
  }
} finally { await browser.close(); }
results.completedAt = new Date().toISOString();
writeFileSync(out + '/credit-audit.json', JSON.stringify(results, null, 2) + '\n');
if (results.files.some(f => f.status === 'FAIL')) process.exitCode = 1;
