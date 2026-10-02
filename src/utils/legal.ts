import type { Movie, Trailer } from "../types/movie";
import { compatibleCandidates } from "../services/playbackHealth";
const legalDomains = [
  "themoviedb.org",
  "www.themoviedb.org",
  "tv.apple.com",
  "www.youtube.com",
  "www.youtube-nocookie.com",
  "archive.org",
  "peach.blender.org",
  "durian.blender.org",
  "mango.blender.org",
  "download.blender.org",
  "creativecommons.org",
  "commons.wikimedia.org",
  "upload.wikimedia.org",
  "studio.blender.org",
];
export function legalUrl(value: string | undefined): string | undefined {
  try {
    const url = new URL(value || "");
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      legalDomains.includes(url.hostname)
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function canPlay(movie: Movie): boolean {
  if (movie.playable === false) return false;
  if (movie.playbackCandidates && !compatibleCandidates(movie.playbackCandidates).length) return false;
  const source = movie.source;
  if (
    movie.contentMode !== "free_legal" ||
    !source?.verified ||
    !source.name.trim() ||
    !source.license.trim() ||
    !legalUrl(source.licenseUrl) ||
    !legalUrl(source.sourceUrl)
  )
    return false;
  const url = legalUrl(source.playableUrl);
  return (
    !!url &&
    ["download.blender.org", "archive.org", "upload.wikimedia.org"].includes(new URL(url).hostname) &&
    /\.(mp4|m4v|mov|webm|ogv|ogg)$/i.test(new URL(url).pathname)
  );
}
export function youtubeKey(url?: string): string | undefined {
  try {
    const parsed = new URL(url || "");
    const key =
      parsed.hostname === "www.youtube.com"
        ? parsed.searchParams.get("v")
        : null;
    return key && /^[\w-]{11}$/.test(key) ? key : undefined;
  } catch {
    return undefined;
  }
}
/** Direct sources must be explicitly reviewed; metadata alone is not authorization. */
export function validTrailer(trailer: Trailer): boolean {
  if (typeof trailer.sourceName !== "string" || !trailer.sourceName.trim() || (!trailer.official && !trailer.verified)) return false;
  if (trailer.provider === "youtube") return /^[\w-]{11}$/.test(trailer.videoId || "");
  return trailer.provider === "direct" && trailer.verified === true &&
    !!legalUrl(trailer.directPlaybackUrl) && !!legalUrl(trailer.sourcePageUrl) &&
    ["video/mp4", "video/webm", "video/ogg"].includes(trailer.mimeType || "");
}
export function preferredTrailer(videos: Trailer[]): Trailer | undefined {
  const rank = (v: Trailer) => !v.official ? 3 :
    v.type === "Teaser" ? 2 : v.provider === "direct" ? 0 : 1;
  return videos.filter(validTrailer).sort((a, b) => rank(a) - rank(b))[0];
}
