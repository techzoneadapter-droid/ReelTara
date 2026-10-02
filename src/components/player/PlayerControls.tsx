import { useEffect, useState, type RefObject } from "react";
import { PlayerOverlay } from "./PlayerOverlay";
import { TrailerControls, type TrailerState } from "./TrailerControls";
export function PlayerControls({ video, loading }: { video: RefObject<HTMLVideoElement | null>; loading: boolean }) {
  const [state, setState] = useState({ time: 0, duration: 0, volume: 100, muted: false, buffered: 0, status: "loading" as TrailerState });
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const sync = () => setState({ time: v.currentTime, duration: Number.isFinite(v.duration) ? v.duration : 0, volume: v.volume * 100, muted: v.muted, buffered: v.buffered.length ? v.buffered.end(v.buffered.length - 1) : 0, status: v.ended ? "ended" : v.paused ? "paused" : "playing" });
    const events = ["timeupdate", "loadedmetadata", "durationchange", "play", "pause", "ended", "volumechange", "progress", "seeked"];
    events.forEach(e => v.addEventListener(e, sync)); sync();
    return () => events.forEach(e => v.removeEventListener(e, sync));
  }, [video, loading]);
  return <PlayerOverlay><TrailerControls state={loading ? "buffering" : state.status} currentTime={state.time} duration={state.duration} volume={state.volume} muted={state.muted} ready={state.duration > 0} buffered={state.buffered}
    onToggle={() => { const v = video.current; if (v) { if (v.paused) void v.play().catch(() => {}); else v.pause(); } }}
    onSeek={t => { if (video.current) video.current.currentTime = Math.max(0, Math.min(state.duration, t)); }}
    onMute={() => { if (video.current) video.current.muted = !video.current.muted; }}
    onVolume={n => { if (video.current) { video.current.volume = n / 100; video.current.muted = n === 0; } }} /></PlayerOverlay>;
}
