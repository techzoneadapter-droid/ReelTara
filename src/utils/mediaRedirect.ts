/** A redirect is usable only after backend verification of an authorized source.
 * This check preserves the provider boundary; it does not grant playback rights.
 */
export function safeMediaRedirect(original: string, final: unknown): string | undefined {
  if (typeof final !== 'string') return;
  try {
    const source = new URL(original), target = new URL(final);
    if ([source, target].some(url => url.protocol !== 'https:' || url.username || url.password || url.port)) return;
    const archive = (host: string) => host === 'archive.org' || /^(?:[a-z0-9-]+\.)+archive\.org$/.test(host);
    if (source.hostname === 'archive.org' && archive(target.hostname)) return target.href;
    if (['upload.wikimedia.org', 'download.blender.org'].includes(source.hostname) && target.hostname === source.hostname) return target.href;
  } catch { /* Malformed or cross-provider destinations remain unusable. */ }
}
