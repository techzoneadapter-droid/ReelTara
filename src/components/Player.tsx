import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Movie } from "../types/movie";
import { canPlay, legalUrl, youtubeKey } from "../services/legal";
import { startFreePlayback } from "../services/freePlayback";
import { PlaybackService, UserStateService } from "../services/userState";
export function Player({
  movie,
  mode,
  onClose,
}: {
  movie: Movie;
  mode: "free" | "trailer";
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const lastVideo = useRef<HTMLVideoElement | null>(null);
  const attachVideo = useCallback((element: HTMLVideoElement | null) => {
    video.current = element;
    if (element) lastVideo.current = element;
  }, []);
  const frame = useRef<HTMLIFrameElement>(null);
  const lastSave = useRef(0);
  const resume = useRef(PlaybackService.resume(movie.id));
  const resumePending = useRef(resume.current > 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const trailerKey = youtubeKey(movie.trailerUrl);
  const allowed = mode === "free" ? canPlay(movie) : !!trailerKey;
  const save = (ended = false) => {
    const element = video.current;
    if (element && !resumePending.current)
      PlaybackService.save(movie, element.currentTime, element.duration, ended);
  };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
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
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== "https://www.youtube-nocookie.com" ||
        event.source !== frame.current?.contentWindow
      )
        return;
      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.event === "onError") {
          setError(
            "Trailer unavailable in the embedded player. Open the official YouTube page below.",
          );
          setLoading(false);
        }
        if (data.event === "onReady") setLoading(false);
        if (data.event === "onStateChange" && data.info === 1)
          UserStateService.trailer(movie.id);
      } catch {
        /* Ignore unrelated embed messages. */
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("message", onMessage);
      document.body.style.overflow = oldOverflow;
      previous?.focus();
    };
  }, [movie]);
  useEffect(() => {
    if (mode !== "free" || !allowed || !video.current) return;
    return startFreePlayback(video.current, movie, {
      loading: setLoading,
      error: setError,
    });
  }, [movie, mode, allowed, attempt]);
  useEffect(() => {
    if (mode === "free") return;
    const timer = setTimeout(() => {
      if (loading) {
        setError("Trailer is taking too long to load. Retry or open YouTube.");
        setLoading(false);
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [loading, attempt, mode]);
  const external = legalUrl(
    mode === "free"
      ? movie.freeSource?.sourcePageUrl || movie.source?.sourceUrl
      : movie.trailerUrl,
  );
  return (
    <dialog
      className="player-dialog"
      ref={dialog}
      aria-label={`${mode === "free" ? "Watch" : "Trailer"}: ${movie.title}`}
      onCancel={(event) => {
        event.preventDefault();
        save();
        onClose();
      }}
    >
      <div className="player-heading">
        <h2>{movie.title}</h2>
        <button
          className="icon-button"
          aria-label="Close player"
          onClick={() => {
            save();
            onClose();
          }}
        >
          <X />
        </button>
      </div>
      {!allowed ? (
        <p role="status">
          {mode === "free"
            ? "Legal stream unavailable. Visit the official source."
            : "Trailer unavailable."}
        </p>
      ) : mode === "free" ? (
        <video
          key={attempt}
          ref={attachVideo}
          controls
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
            setLoading(false);
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
      ) : (
        <iframe
          key={attempt}
          ref={frame}
          title={`${movie.title} official trailer`}
          src={`https://www.youtube-nocookie.com/embed/${trailerKey}?enablejsapi=1&origin=${encodeURIComponent(location.origin)}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => {
            setLoading(false);
            const target = frame.current?.contentWindow;
            target?.postMessage(
              JSON.stringify({ event: "listening", id: "reeltara" }),
              "https://www.youtube-nocookie.com",
            );
            for (const name of ["onReady", "onError", "onStateChange"])
              target?.postMessage(
                JSON.stringify({
                  event: "command",
                  func: "addEventListener",
                  args: [name],
                }),
                "https://www.youtube-nocookie.com",
              );
          }}
          onError={() => {
            setError("Trailer unavailable. Open the official YouTube page.");
            setLoading(false);
          }}
        />
      )}
      {loading && allowed && (
        <p role="status">Loading {mode === "free" ? "stream" : "trailer"}…</p>
      )}
      {error && (
        <p role="status">
          {error}{" "}
          <button
            className="back-link"
            onClick={() => {
              resume.current =
                video.current?.currentTime ||
                PlaybackService.resume(movie.id) ||
                resume.current;
              resumePending.current = resume.current > 0;
              setError("");
              setLoading(true);
              setAttempt((v) => v + 1);
            }}
          >
            Retry
          </button>
        </p>
      )}
      <div className="hero-buttons">
        {mode === "free" && allowed && (
          <button
            className="button secondary"
            onClick={() => {
              resume.current = 0;
              resumePending.current = false;
              if (video.current) {
                try {
                  video.current.currentTime = 0;
                } catch {
                  /* Non-seekable media. */
                }
                save();
              }
            }}
          >
            Restart from beginning
          </button>
        )}
        {external && (
          <a
            className="button secondary"
            href={external}
            target="_blank"
            rel="noopener noreferrer"
          >
            {mode === "free" ? "View Source" : "Open on YouTube"}
          </a>
        )}
      </div>
      {mode === "free" && (
        <p className="player-attribution">
          {movie.source?.attribution} ·{" "}
          <a
            href={legalUrl(movie.source?.licenseUrl)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {movie.source?.license}
          </a>
        </p>
      )}
    </dialog>
  );
}
