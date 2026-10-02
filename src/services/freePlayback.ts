import type { Movie, PlaybackCandidate } from "../types/movie";
import { compatibleCandidates, playbackQuery, failed, healthy, revalidate } from "./playbackHealth";
import { legalUrl } from "./legal";

export const mediaErrorNames: Record<number, string> = {
  1: "MEDIA_ERR_ABORTED",
  2: "MEDIA_ERR_NETWORK",
  3: "MEDIA_ERR_DECODE",
  4: "MEDIA_ERR_SRC_NOT_SUPPORTED",
};
const retryMovies = new Set<string>();
export function resetPlaybackHealth(movie: Movie) { retryMovies.add(movie.id); (movie.playbackCandidates || playbackCandidates(movie)).forEach(c => revalidate(c.url)); }
export function playbackCandidates(movie: Movie): (PlaybackCandidate & { priority: number })[] {
  if (movie.playbackCandidates?.length) return compatibleCandidates(movie.playbackCandidates.filter(c => legalUrl(c.url))).map((c,i) => ({ ...c, priority: i+1 }));
  const source = movie.freeSource;
  return [
    ...new Set(
      source
        ? [source.playbackUrl, ...source.fallbackPlaybackUrls]
        : [movie.source?.playableUrl],
    ),
  ]
    .filter(
      (url): url is string =>
        !!legalUrl(url) && /\.mp4$/i.test(new URL(url!).pathname),
    )
    .map((url, index) => ({ url, mimeType: "video/mp4", health: "unknown" as const, priority: index + 1 }));
}

/** Owns one video's source lifecycle. Dispose cancels probes, timers and stale events. */
export function startFreePlayback(
  video: HTMLVideoElement,
  movie: Movie,
  callbacks: {
    loading: (value: boolean) => void;
    error: (value: string) => void;
  },
) {
  const candidates = compatibleCandidates(playbackCandidates(movie), video);
  const recheck = retryMovies.delete(movie.id);
  let index = -1;
  let generation = 0;
  let disposed = false;
  let active = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let position = 0;
  let shouldPlay = false;
  let seekingDisabled = false;
  let seekTimer: ReturnType<typeof setTimeout> | undefined;
  let removeListeners = () => {};
  const clearTimer = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const log = (event: string, details: Record<string, unknown> = {}) =>
    console.info("[Free Legal playback]", {
      movie: movie.id,
      title: movie.title,
      sourceProvider: candidates[index]?.sourceProvider || movie.provider,
      licenseType: movie.source?.license,
      verifiedLegal: movie.source?.verified,
      playable: movie.playable ?? true,
      mimeType: candidates[index]?.mimeType,
      quality: candidates[index]?.quality || candidates[index]?.height,
      canPlayType: candidates[index] ? video.canPlayType(candidates[index].mimeType) : '',
      videoErrorCode: video.error?.code ?? null,
      sourcePageUrl: movie.freeSource?.sourcePageUrl || movie.source?.sourceUrl,
      playbackUrl: candidates[index]?.url,
      event,
      ...details,
    });
  const arm = () => {
    if (timer !== undefined) return;
    timer = setTimeout(
      () => fail("Media load/buffering timeout (10s)"),
      10_000,
    );
  };
  const fail = (reason: string) => {
    if (disposed || !active) return;
    active = false;
    const url = candidates[index]?.url;
    if (url) failed(url);
    log("candidate-failed", {
      reason,
      videoErrorCode: video.error?.code ?? null,
      videoErrorName: mediaErrorNames[video.error?.code || 0] ?? null,
      videoErrorMessage: video.error?.message ?? null,
    });
    void next();
  };
  async function next() {
    const ownGeneration = ++generation;
    active = false;
    removeListeners();
    clearTimer();
    clearTimeout(seekTimer);
    controller?.abort();
    const preservePlay = shouldPlay;
    video.pause();
    shouldPlay = preservePlay;
    video.removeAttribute("src");
    video.querySelectorAll("source").forEach(s => s.remove());
    video.load();
    index++;
    if (disposed) return;
    if (index >= candidates.length) {
      callbacks.loading(false);
      callbacks.error(
        "Playback unavailable. Retry or view the official source.",
      );
      return;
    }
    callbacks.loading(true);
    callbacks.error("");
    active = true;
    seekingDisabled = false;
    arm(); // Includes the HTTP probe and metadata load in the 10s candidate budget.
    const candidate = candidates[index];
    controller = new AbortController();
    try {
      const response = await fetch(
        `/api/playback?${playbackQuery(candidate)}${recheck ? "&revalidate=1" : ""}`,
        {
          signal: controller.signal,
          cache: "no-store",
        },
      );
      const probe = await response.json();
      if (disposed || ownGeneration !== generation) return;
      log("probe", probe);
      if (!response.ok || !probe.ok) {
        fail("HTTP media probe failed");
        return;
      }
      // Use the canonical URL and MIME returned by provider verification.
      const media = probe.candidate || candidate;
      if (!video.canPlayType(media.mimeType)) { fail('Unsupported browser codec'); return; }
      let started = false;
      let metadataReady = false;
      let canPlayReady = false;
      let didPlay = false;
      let progressLogged = false;
      const handlers: Record<string, EventListener> = {
        loadstart: () => {
          started = true;
        },
        loadedmetadata: () => {
          if (!Number.isFinite(video.duration) || video.duration <= 0) {
            fail("Invalid duration");
            return;
          }
          metadataReady = true;
          log("loadedmetadata", { duration: video.duration });
          if (position > 0 && position < video.duration) {
            try {
              video.currentTime = position;
            } catch {
              seekingDisabled = true;
            }
          }
          if (shouldPlay)
            void video.play().catch((error) => {
              if (
                error.name !== "NotAllowedError" &&
                error.name !== "AbortError"
              )
                fail(error.message);
            });
        },
        canplay: () => {
          canPlayReady = metadataReady;
          if (!canPlayReady) return;
          healthy(candidate.url);
          clearTimer();
          callbacks.loading(false);
          log("canplay");
        },
        play: () => {
          shouldPlay = true;
        },
        pause: () => {
          if (!video.error) shouldPlay = false;
        },
        playing: () => {
          clearTimer();
          callbacks.loading(false);
          shouldPlay = true;
          didPlay = true;
          log("playing", {
            currentTime: video.currentTime,
            duration: video.duration,
          });
        },
        waiting: () => {
          callbacks.loading(true);
          arm();
        },
        stalled: () => {
          log("stalled");
          if (!video.paused || video.readyState < 1) {
            callbacks.loading(true);
            arm();
          }
        },
        timeupdate: () => {
          const advanced = video.currentTime > position;
          if (!video.seeking && video.currentTime > 0)
            position = video.currentTime;
          if (advanced && didPlay && metadataReady && canPlayReady && !video.paused && video.readyState >= 3) {
            healthy(candidate.url);
            if (!progressLogged) { log('progress', { currentTime: video.currentTime, duration: video.duration }); progressLogged = true; }
            clearTimer();
            callbacks.loading(false);
          }
        },
        seeking: () => {
          if (seekingDisabled) {
            try {
              if (Math.abs(video.currentTime - position) > 0.1)
                video.currentTime = position;
            } catch {
              /* Native controls remain usable. */
            }
            return;
          }
          clearTimeout(seekTimer);
          seekTimer = setTimeout(() => {
            seekingDisabled = true;
            log("seek-unavailable");
            try {
              video.currentTime = position;
            } catch {
              /* A seek must never crash the player. */
            }
          }, 8000);
        },
        seeked: () => {
          clearTimeout(seekTimer);
        },
        error: () =>
          fail(mediaErrorNames[video.error?.code || 0] || "Media source error"),
        abort: () => {
          if (started) fail("Media request aborted");
        },
        emptied: () => {
          if (started) fail("Media unexpectedly emptied");
        },
        ended: () => {
          clearTimer();
          shouldPlay = false;
          callbacks.loading(false);
          log("ended");
        },
      };
      for (const [name, handler] of Object.entries(handlers)) {
        handlers[name] = (event) => {
          if (!disposed && ownGeneration === generation && active)
            handler(event);
        };
      }
      const source = document.createElement("source");
      for (const [name, handler] of Object.entries(handlers))
        video.addEventListener(name, handler);
      removeListeners = () => {
        for (const [name, handler] of Object.entries(handlers))
          video.removeEventListener(name, handler);
        source.removeEventListener("error", handlers.error);
      };
      source.src = probe.playbackUrl || media.url;
      source.type = media.mimeType;
      // With <source>, unsupported-media errors may fire only on the source element.
      source.addEventListener("error", handlers.error);
      video.querySelectorAll("track").forEach(t => t.remove());
      for (const caption of movie.captionTracks || []) { if (!legalUrl(caption.src)) continue; const track = document.createElement("track"); track.kind = "subtitles"; track.src = caption.src; track.srclang = caption.language; track.label = caption.label; video.append(track); }
      video.append(source);
      video.load();
    } catch (error) {
      if (!disposed && ownGeneration === generation)
        fail(error instanceof Error ? error.message : "Network failure");
    }
  }
  log("selected-movie", { playbackCandidates: candidates });
  void next();
  return () => {
    disposed = true;
    generation++;
    active = false;
    clearTimer();
    clearTimeout(seekTimer);
    controller?.abort();
    removeListeners();
    const preservePlay = shouldPlay;
    video.pause();
    shouldPlay = preservePlay;
    video.removeAttribute("src");
    video.querySelectorAll("source").forEach(s => s.remove());
    video.load();
  };
}
