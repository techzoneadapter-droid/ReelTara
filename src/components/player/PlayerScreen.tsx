import { useEffect, useRef } from "react";
import { PlayerTopBar } from "./PlayerTopBar";
import type { Movie } from "../../types/movie";
import { FreeMoviePlayer } from "./FreeMoviePlayer";
import { TrailerPlayer } from "./TrailerPlayer";
import "./player.css";

export function PlayerScreen({
  movie,
  mode,
  onClose, next, onNext,
}: {
  next?: Movie; onNext?: () => void;
  movie: Movie;
  mode: "free" | "trailer";
  onClose: () => void;
}) {
  const back = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const position = history.state?.detailScroll || 0;
    window.scrollTo(0, 0);
    back.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) {
        const screen = back.current?.closest(".player-screen");
        if (screen?.classList.contains("trailer-immersive")) {
          screen.classList.remove("trailer-immersive");
          document.dispatchEvent(new Event("fullscreenchange"));
        } else close.current();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("keydown", keyboard);
      requestAnimationFrame(() => {
        window.scrollTo(0, position);
        previous?.focus({ preventScroll: true });
      });
    };
  }, []);
  return (
    <main
      className="player-screen"
      aria-label={`${mode === "free" ? "Watch" : "Trailer"}: ${movie.title}`}
    >
      <PlayerTopBar title={movie.title} mode={mode} onClose={onClose} back={back} />
      {mode === "free" ? (
        <FreeMoviePlayer movie={movie} onClose={onClose} next={next} onNext={onNext} />
      ) : (
        <TrailerPlayer movie={movie} onClose={onClose} />
      )}
    </main>
  );
}
