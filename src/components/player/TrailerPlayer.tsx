import { useCallback, useEffect, useRef, useState } from "react";
import type { Movie } from "../../types/movie";
import { legalUrl, validTrailer } from "../../services/legal";
import { UserStateService } from "../../services/userState";
import { loadYouTubeAPI, type YouTubePlayer } from "../../services/youtubePlayer";
import { VideoSurface } from "./VideoSurface";
import { PlaybackError } from "./PlaybackError";
import { TrailerControls, type TrailerState } from "./TrailerControls";

const states: Record<number, TrailerState> = {
  [-1]: "unstarted", 0: "ended", 1: "playing", 2: "paused", 3: "buffering", 5: "cued",
};
export function TrailerPlayer({ movie, onClose }: { movie: Movie; onClose: () => void }) {
  const trailer = movie.trailer;
  const allowed = !!trailer && validTrailer(trailer);
  const mount = useRef<HTMLDivElement>(null);
  const youtube = useRef<YouTubePlayer | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<TrailerState>("loading");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const sync = useCallback(() => {
    const p = youtube.current;
    const v = video.current;
    const time = p ? p.getCurrentTime() : v?.currentTime || 0;
    const length = p ? p.getDuration() : v?.duration || 0;
    setCurrentTime(Number.isFinite(time) ? time : 0);
    setDuration(Number.isFinite(length) ? length : 0);
    const level = p ? p.getVolume() : (v?.volume ?? 1) * 100;
    setVolume(level);
    setMuted((p ? p.isMuted() : v?.muted || false) || level === 0);
  }, []);
  useEffect(() => {
    setReady(false); setError(""); setState("loading"); setCurrentTime(0); setDuration(0); setMuted(false);
    if (!allowed || !trailer) { setState("error"); setError("No verified trailer source is available."); return; }
    if (trailer.provider !== "youtube" || !mount.current) return;
    let active = true;
    let failed = false;
    let instance: YouTubePlayer | undefined;
    const fail = (message: string) => { if (active) { failed = true; setState("error"); setReady(false); setError(message); } };
    const timer = setTimeout(() => fail("Trailer is taking too long to load. Retry or open the original source."), 20000);
    const element = document.createElement("div");
    mount.current.append(element);
    void loadYouTubeAPI().then(api => {
      if (!active || failed) return;
      instance = new api.Player(element, {
        host: "https://www.youtube-nocookie.com",
        videoId: trailer.videoId!,
        playerVars: { controls: 0, playsinline: 1, rel: 0, enablejsapi: 1, autoplay: 1, origin: location.origin },
        events: {
          onReady: ({ target }) => {
            if (!active || failed) return;
            clearTimeout(timer);
            youtube.current = target;
            const iframe = target.getIframe();
            iframe.title = `${movie.title} official trailer`;
            iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
            iframe.allowFullscreen = true;
            iframe.referrerPolicy = "strict-origin-when-cross-origin";
            setReady(true);
            setState(states[target.getPlayerState()] || "unstarted");
            sync();
          },
          onStateChange: ({ data }) => {
            if (!active || failed) return;
            setState(states[data] || "unstarted");
            sync();
            if (data === 1) UserStateService.trailer(movie.id);
          },
          onAutoplayBlocked: () => { if (active && !failed) { setState("paused"); sync(); } },
          onError: () => { clearTimeout(timer); fail("Trailer unavailable in this player. Retry or open the original source."); },
        },
      });
      youtube.current = instance;
      const iframe = instance.getIframe();
      iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      iframe.allowFullscreen = true;
    }).catch(() => { clearTimeout(timer); fail("Could not connect to the trailer source. Retry or open the original source."); });
    return () => {
      active = false;
      clearTimeout(timer);
      youtube.current = null;
      instance?.destroy();
      element.remove();
    };
  }, [movie.id, movie.title, trailer, allowed, attempt, sync]);
  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(sync, 400);
    return () => clearInterval(timer);
  }, [ready, sync]);
  useEffect(() => {
    if (!allowed || trailer?.provider !== "direct" || ready || state !== "loading") return;
    const timer = setTimeout(() => {
      setState("error"); setError("Trailer is taking too long to load. Retry or open the original source.");
    }, 20000);
    return () => clearTimeout(timer);
  }, [allowed, trailer, ready, state, attempt]);
  const seek = useCallback((seconds: number) => {
    if (!ready || !duration || !Number.isFinite(seconds)) return;
    const target = Math.max(0, Math.min(duration, seconds));
    if (youtube.current) youtube.current.seekTo(target, true);
    else if (video.current) video.current.currentTime = target;
    // Report the actual player position; do not simulate progress.
    sync();
  }, [ready, duration, sync]);
  const toggle = useCallback(() => {
    if (!ready) return;
    const p = youtube.current;
    const v = video.current;
    if (p) {
      if (p.getPlayerState() === 1) p.pauseVideo();
      else { if (p.getPlayerState() === 0) p.seekTo(0, true); p.playVideo(); }
    } else if (v) {
      if (!v.paused) v.pause();
      else void v.play().catch(() => setState("paused"));
    }
  }, [ready]);
  useEffect(() => {
    if (state !== "buffering") return;
    const timer = setTimeout(() => { setState("error"); setError("Playback timed out. Retry or open the original source."); }, 30000);
    return () => clearTimeout(timer);
  }, [state]);
  const external = legalUrl(trailer?.sourcePageUrl);
  return (
    <div className={`trailer-player ${trailer?.provider === "direct" ? "trailer-direct" : ""}`} data-player-state={state}>
      <VideoSurface>
        {allowed && trailer?.provider === "youtube" && <div ref={mount} className="youtube-mount" />}
        {allowed && trailer?.provider === "direct" && (
          <video key={attempt} ref={video} autoPlay playsInline preload="metadata" aria-label={`${movie.title} trailer`}
            onLoadedMetadata={() => { setReady(true); setState(video.current?.paused ? "paused" : "playing"); sync(); }}
            onTimeUpdate={sync} onDurationChange={sync} onVolumeChange={sync}
            onPlay={() => { setState("playing"); UserStateService.trailer(movie.id); }}
            onPlaying={() => setState("playing")} onPause={() => { setState("paused"); sync(); }}
            onStalled={() => setState("buffering")} onCanPlay={() => setState(video.current?.paused ? "paused" : "playing")} onWaiting={() => setState("buffering")} onSeeking={() => setState("buffering")}
            onSeeked={() => { setState(video.current?.paused ? "paused" : "playing"); sync(); }}
            onEnded={() => { setState("ended"); sync(); }}
            onError={() => { setReady(false); setState("error"); setError("Trailer unavailable. Retry or open the original source."); }}>
            <source src={legalUrl(trailer.directPlaybackUrl)} type={trailer.mimeType} />
          </video>
        )}
      </VideoSurface>
      {/* Keep every ReelTara element outside the YouTube viewport, including errors and loading. */}
      {error ? <div className="trailer-error"><PlaybackError message={error} source={external} sourceLabel="Open original source" onBack={onClose} onRetry={() => setAttempt(value => value + 1)} /></div> : (
        <TrailerControls state={state} currentTime={currentTime} duration={duration} muted={muted} volume={volume} ready={ready}
          onToggle={toggle} onSeek={seek}
          onMute={() => {
            const p = youtube.current; const v = video.current;
            if (p) {
              if (muted) { if (p.getVolume() === 0) p.setVolume(100); p.unMute(); }
              else p.mute();
            } else if (v) {
              if (muted) { if (v.volume === 0) v.volume = 1; v.muted = false; }
              else v.muted = true;
            }
            sync();
          }}
          onVolume={value => {
            const p = youtube.current; const v = video.current;
            if (p) { p.setVolume(value); if (value > 0) p.unMute(); else p.mute(); }
            else if (v) { v.volume = value / 100; v.muted = value === 0; }
            sync();
          }} />
      )}
    </div>
  );
}
