import type { PlaybackCandidate } from '../types/movie';
const key = 'reeltara-playback-health-v2';
type Health = { failures: number; until: number; healthyUntil?: number };
const health = new Map<string, Health>();
try {
  for (const [url, value] of JSON.parse(localStorage.getItem(key) || '[]')) {
    if (value.until > Date.now() || value.healthyUntil > Date.now()) health.set(url, value);
  }
} catch { /* Optional storage. */ }
function save() {
  try { localStorage.setItem(key, JSON.stringify([...health].slice(-400))); } catch { /* Optional storage. */ }
}
export function isBroken(url: string) { return (health.get(url)?.until || 0) > Date.now(); }
export function isHealthy(url: string) { return !isBroken(url) && (health.get(url)?.healthyUntil || 0) > Date.now(); }
export function failed(url: string) {
  const failures = (health.get(url)?.failures || 0) + 1;
  health.set(url, { failures, until: failures >= 2 ? Date.now() + 3600000 : 0 });
  save();
}
export function healthy(url: string) { health.set(url, { failures: 0, until: 0, healthyUntil: Date.now() + 3600000 }); save(); }
export function revalidate(url: string) { health.delete(url); save(); }
export function compatibleCandidates<T extends Pick<PlaybackCandidate, 'url' | 'mimeType' | 'height'>>(candidates: T[], video?: HTMLVideoElement): T[] {
  const element = video || (typeof document !== 'undefined' ? document.createElement('video') : undefined);
  if (!element) return candidates;
  const support = (c: T) => element.canPlayType(c.mimeType);
  const format = (c: T) => c.mimeType.startsWith('video/mp4') ? 0 : c.mimeType.startsWith('video/webm') ? 1 : 2;
  return candidates.filter(c => support(c) !== '' && !isBroken(c.url)).sort((a,b) => Number(support(b) === 'probably') - Number(support(a) === 'probably') || format(a)-format(b) || Math.abs((a.height || 720)-720)-Math.abs((b.height || 720)-720));
}
/** Headers are not media health. Check actual decoding before offering Watch Free. */
export async function checkMedia(candidate: PlaybackCandidate): Promise<boolean> {
  if (isHealthy(candidate.url)) return true;
  if (typeof document === 'undefined' || !compatibleCandidates([candidate]).length) return false;
  return new Promise(resolve => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    let metadata = false;
    const finish = (ok: boolean) => {
      clearTimeout(timer);
      video.onloadedmetadata = video.oncanplay = video.onerror = null;
      video.pause(); video.removeAttribute('src'); video.load();
      if (ok) healthy(candidate.url); else failed(candidate.url);
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), 12000);
    video.onloadedmetadata = () => { metadata = Number.isFinite(video.duration) && video.duration > 0; if (!metadata) finish(false); };
    video.oncanplay = () => finish(metadata);
    video.onerror = () => finish(false);
    video.src = candidate.url;
    video.load();
  });
}
export function playbackQuery(candidate: PlaybackCandidate) {
  if (!candidate.sourceProvider) return `url=${encodeURIComponent(candidate.url)}`; // Exact reviewed seed URLs only.
  return new URLSearchParams({ provider: candidate.sourceProvider, sourceId: candidate.sourceId || '', fileName: candidate.fileName || '', ...(candidate.index !== undefined ? { index: String(candidate.index) } : {}) }).toString();
}
