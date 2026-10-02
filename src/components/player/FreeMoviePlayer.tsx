import { useCallback, useEffect, useRef, useState } from "react";
import { PlayerControls } from "./PlayerControls";
import { PlayerSettings } from "./PlayerSettings";
import { PlayerEndScreen } from "./PlayerEndScreen";
import { PlaybackErrorState as PlaybackError } from "./PlaybackErrorState";
import { VideoSurface } from "./VideoSurface";
import { LegalSourceFooter } from "./LegalSourceFooter";
import type { Movie } from "../../types/movie";
import { canPlay, legalUrl } from "../../services/legal";
import { startFreePlayback, resetPlaybackHealth } from "../../services/freePlayback";
import { PlaybackService } from "../../services/userState";
export function FreeMoviePlayer({
  movie,
  onClose, next, onNext,
}: {
  next?: Movie; onNext?: () => void;
  movie: Movie;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const lastVideo = useRef<HTMLVideoElement | null>(null);
  const attachVideo = useCallback((element: HTMLVideoElement | null) => {
    video.current = element;
    if (element) lastVideo.current = element;
  }, []);
  const lastSave = useRef(0);
  const resume = useRef(PlaybackService.resume(movie.id));
  const resumePending = useRef(resume.current > 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  // Keep the authorized screen mounted even if candidate health changes mid-playback.
  const [allowed] = useState(() => canPlay(movie));

  const save = (ended = false) => {
    const element = video.current;
    if (element && !resumePending.current)
      PlaybackService.save(movie, element.currentTime, element.duration, ended);
  };
  useEffect(() => {
    const flush = () => {
      const element = lastVideo.current;
      if (element && !resumePending.current)
        PlaybackService.save(
          movie,
          element.currentTime,
          element.duration,
          element.ended,
        );
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [movie]);
  useEffect(() => {
    if (!allowed || !video.current) return;
    return startFreePlayback(video.current, movie, {
      loading: setLoading,
      error: setError,
    });
  }, [movie, allowed, attempt]);
  const external = legalUrl(
    movie.freeSource?.sourcePageUrl || movie.source?.sourceUrl,
  );
  return (
    <>
      <VideoSurface>
        {allowed && (
          <video
            key={attempt}
            ref={attachVideo}
            autoPlay
            aria-label={`${movie.title} video`}
            playsInline
            preload="metadata"
            poster={movie.poster || undefined}
            onLoadedMetadata={(event) => {
              const el = event.currentTarget;
              if (
                resumePending.current &&
                resume.current > 0 &&
                resume.current < el.duration * 0.95
              ) {
                try {
                  el.currentTime = resume.current;
                } catch {
                  resumePending.current = false;
                }
              } else resumePending.current = false;
            }}
            onTimeUpdate={() => {

              if (Date.now() - lastSave.current > 5000) {
                save();
                lastSave.current = Date.now();
              }
            }}
            onPause={() => save()}
            onSeeked={() => {
              if (
                video.current &&
                video.current.currentTime >= resume.current - 0.1
              )
                resumePending.current = false;
              save();
            }}
            onEnded={() => save(true)}
          />
        )}
        {loading && allowed && <span className="player-buffering" role="status" aria-label="Buffering"><span className="trailer-spinner" /></span>}
        {error && (
          <PlaybackError
            message={error}
            source={external}
            onBack={onClose}
            onRetry={() => {
              resetPlaybackHealth(movie);
              resume.current =
                PlaybackService.resume(movie.id) || resume.current;
              resumePending.current = resume.current > 0;
              setError("");
              setLoading(true);
              setAttempt((value) => value + 1);
            }}
          />
        )}
      </VideoSurface>
      <PlayerControls video={video} loading={loading} />
      <PlayerSettings video={video} movie={movie} onRestart={() => {
        resume.current = 0; resumePending.current = false;
        if (video.current) { video.current.currentTime = 0; save(); }
      }} />
      <PlayerEndScreen video={video} onClose={onClose} next={next} onNext={onNext} />
      <section className="player-info">
        <LegalSourceFooter movie={movie} showSource={!error} />
      </section>
    </>
  );
}
