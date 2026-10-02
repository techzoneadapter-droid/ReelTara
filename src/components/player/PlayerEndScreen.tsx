import type { Movie } from "../../types/movie";
import { useEffect, useState, type RefObject } from "react";
export function PlayerEndScreen({ video, onClose, next, onNext }: { next?: Movie; onNext?: () => void; video: RefObject<HTMLVideoElement | null>; onClose: () => void }) {
  const [ended, setEnded] = useState(false);
  useEffect(() => { const v = video.current; if (!v) return; const end = () => setEnded(true); const play = () => setEnded(false); v.addEventListener("ended", end); v.addEventListener("play", play); return () => { v.removeEventListener("ended", end); v.removeEventListener("play", play); }; }, [video]);
  return ended ? <div className="player-end"><h2>Thanks for watching</h2><button className="button" onClick={() => { if (video.current) { video.current.currentTime = 0; void video.current.play().catch(() => {}); } }}>Replay</button><button className="button secondary" onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("reeltara-free")); }}>More Free Movies</button>{next && onNext && <button className="button secondary" onClick={onNext}>Next: {next.title}</button>}</div> : null;
}
