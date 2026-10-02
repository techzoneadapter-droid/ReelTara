import type { RefObject } from "react";
import type { Movie } from "../../types/movie";
export function PlayerSettings({ video, movie, onRestart }: { video: RefObject<HTMLVideoElement | null>; movie: Movie; onRestart: () => void }) {
  return <details className="player-settings"><summary aria-label="Player settings">⚙</summary><div>
    <button onClick={onRestart}>Restart</button>
    <label>Playback speed <select defaultValue="1" onChange={e => { if (video.current) video.current.playbackRate = Number(e.target.value); }}>{[0.5, 1, 1.25, 1.5, 2].map(n => <option key={n} value={n}>{n}×</option>)}</select></label>
    {!!movie.captionTracks?.length && <label>Captions <select defaultValue="off" onChange={e => { if (video.current) Array.from(video.current.textTracks).forEach((t, i) => { t.mode = String(i) === e.target.value ? "showing" : "disabled"; }); }}><option value="off">Off</option>{movie.captionTracks.map((t, i) => <option key={t.src} value={i}>{t.label}</option>)}</select></label>}
  </div></details>;
}
