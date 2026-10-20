import sources from '../data/freeSources.json';
export function reviewedPlaybackUrls(id: string): string[] {
  if (!Object.hasOwn(sources, id)) return [];
  const source = sources[id as keyof typeof sources];
  return [source.playbackUrl, ...source.fallbackPlaybackUrls];
}

/** Only exact reviewed files may play, including old records from local storage. */
export function reviewedPlaybackUrl(id: string, url: string): boolean {
  if (!Object.hasOwn(sources, id)) return false;
  const source = sources[id as keyof typeof sources];
  return [source.playbackUrl, ...source.fallbackPlaybackUrls].includes(url);
}
export function reviewedCatalogItem(item: { id: string; sourcePageUrl: string; licenseUrl?: string; playbackCandidates: { url: string }[] }): boolean {
  if (!Object.hasOwn(sources, item.id)) return false;
  const source = sources[item.id as keyof typeof sources];
  return item.sourcePageUrl === source.sourcePageUrl && item.licenseUrl === source.licenseUrl &&
    item.playbackCandidates.length > 0 && item.playbackCandidates.every(c => reviewedPlaybackUrl(item.id, c.url));
}
