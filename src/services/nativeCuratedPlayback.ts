import reviewedSources from "../data/freeSources.json";
import type { Movie } from "../types/movie";

/** Native-only transport fallback for exact reviewed Blender CC BY files.
 * Dynamic Archive/Commons uploads still require server-side verification.
 */
export function isNativeAndroid(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
  }).Capacitor;
  return cap?.isNativePlatform?.() === true && cap.getPlatform?.() === "android";
}

export function isReviewedNativeCandidate(
  movie: Movie, url: string, nativeAndroid = isNativeAndroid(),
): boolean {
  if (!nativeAndroid || movie.contentMode !== "free_legal" ||
      movie.free !== true || movie.source?.verified !== true) return false;
  if (!(movie.id in reviewedSources)) return false;
  const s = reviewedSources[movie.id as keyof typeof reviewedSources];
  if (movie.source.license !== s.licenseType ||
      movie.source.licenseUrl !== s.licenseUrl ||
      movie.source.sourceUrl !== s.sourcePageUrl) return false;
  return [s.playbackUrl, ...s.fallbackPlaybackUrls].includes(url);
}
