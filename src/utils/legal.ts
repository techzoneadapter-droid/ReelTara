import type { Movie, Trailer } from "../types/movie";
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
    ["download.blender.org", "archive.org"].includes(new URL(url).hostname) &&
    /\.(mp4|m4v|mov)$/i.test(new URL(url).pathname)
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
export function preferredTrailer(videos: Trailer[]): Trailer | undefined {
  return videos
    .filter((v) => /^[\w-]{11}$/.test(v.key))
    .sort(
      (a, b) =>
        (a.type === "Trailer" ? 0 : 2) +
        (a.official ? 0 : 1) -
        ((b.type === "Trailer" ? 0 : 2) + (b.official ? 0 : 1)),
    )[0];
}
