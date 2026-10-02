import { PlayerProgress } from "./PlayerProgress";
import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
export type TrailerState = "loading" | "unstarted" | "cued" | "playing" | "paused" | "buffering" | "ended" | "error";
const time = (seconds: number) => {
  const value = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
};
export function TrailerControls({ state, currentTime, duration, muted, volume, ready, buffered = 0, onToggle, onSeek, onMute, onVolume }: {
  buffered?: number; state: TrailerState; currentTime: number; duration: number; muted: boolean; volume: number; ready: boolean;
  onToggle: () => void; onSeek: (seconds: number) => void; onMute: () => void; onVolume: (volume: number) => void;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState("");
  const seekBy = (delta: number) => { onSeek(currentTime + delta); setFeedback(delta < 0 ? "↶ 10" : "10 ↷"); };
  useEffect(() => { if (!feedback) return; const t = setTimeout(() => setFeedback(""), 700); return () => clearTimeout(t); }, [feedback]);
  const [visible, setVisible] = useState(true);
  const [activity, setActivity] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const lastTouch = useRef(0);
  const tap = useRef({ time: 0, side: "" });
  const reveal = () => { setVisible(true); setActivity(value => value + 1); };
  useEffect(() => {
    setVisible(true);
    if (state !== "playing" || drag !== null) return;
    const timer = setTimeout(() => {
      setVisible(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [state, activity, drag]);
  useEffect(() => {
    const change = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (!ready || (event.target instanceof HTMLElement && event.target.closest("input, select, textarea, a, [contenteditable]"))) return;
      const backwards = ["arrowleft", "j"].includes(event.key.toLowerCase());
      const forwards = ["arrowright", "l"].includes(event.key.toLowerCase());
      if (backwards || forwards) { event.preventDefault(); onSeek(currentTime + (backwards ? -10 : 10)); reveal(); }
      if (["f", "m"].includes(event.key.toLowerCase())) { event.preventDefault(); if (event.key.toLowerCase() === "f") void toggleFullscreen(); else onMute(); reveal(); }
      if ((event.code === "Space" || event.key.toLowerCase() === "k") && !(event.target instanceof HTMLElement && event.target.closest("button"))) {
        event.preventDefault(); onToggle(); reveal();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [ready, currentTime, onSeek, onToggle]);
  const toggleFullscreen = async () => {
    const screen = rail.current?.closest<HTMLElement>(".player-screen");
    if (!screen) return;
    if (document.fullscreenElement) { await document.exitFullscreen().catch(() => {}); return; }
    if (screen.classList.contains("trailer-immersive")) {
      screen.classList.remove("trailer-immersive"); setFullscreen(false); return;
    }
    try {
      if (!screen.requestFullscreen) throw new Error("Unsupported");
      await screen.requestFullscreen();
      await (window.screen.orientation as ScreenOrientation & { lock?: (value: string) => Promise<void> }).lock?.("landscape").catch(() => {});
    } catch {
      // iOS and embedded browsers can use the same container within the viewport.
      screen.classList.add("trailer-immersive"); setFullscreen(true);
    }
  };
  useEffect(() => {
    let active = true;
    let lock: WakeLockSentinel | undefined;
    const update = async () => {
      await lock?.release().catch(() => {}); lock = undefined;
      if (active && state === "playing" && document.visibilityState === "visible" && "wakeLock" in navigator) {
        try { const acquired = await navigator.wakeLock.request("screen"); if (!active || document.hidden) await acquired.release(); else lock = acquired; } catch { /* Optional browser capability. */ }
      }
    };
    void update(); document.addEventListener("visibilitychange", update);
    return () => { active = false; void lock?.release().catch(() => {}); document.removeEventListener("visibilitychange", update); };
  }, [state]);
  const busy = state === "loading" || state === "buffering";
  return (
    <div ref={rail} className="trailer-control-rail" onPointerMove={reveal} onPointerDown={reveal} onFocus={reveal} onBlur={reveal}
      onDoubleClick={event => {
        if (Date.now() - lastTouch.current < 500 || (event.target as HTMLElement).closest("button, input")) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        onSeek(currentTime + (event.clientX < bounds.left + bounds.width / 2 ? -10 : 10));
      }}
      onPointerUp={event => {
        if (event.pointerType !== "touch" || (event.target as HTMLElement).closest("button, input")) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const side = event.clientX < bounds.left + bounds.width / 2 ? "left" : "right";
        const now = Date.now();
        lastTouch.current = now;
        if (tap.current.side === side && now - tap.current.time < 350) {
          seekBy(side === "left" ? -10 : 10); tap.current.time = 0;
        } else tap.current = { time: now, side };
      }}>
      {feedback && <span className="seek-feedback" role="status">{feedback}</span>}
      <div className={`trailer-control-content ${visible ? "" : "controls-hidden"}`}>
        <div className="trailer-center-controls">
          <button className="icon-button" aria-label="Seek backward 10 seconds" disabled={!ready || !duration} onClick={() => seekBy(-10)}><RotateCcw size={22} /><span>10</span></button>
          <button className="trailer-toggle" aria-label={state === "playing" ? "Pause" : state === "ended" ? "Replay" : "Play"} disabled={!ready} onClick={onToggle}>
            {busy ? <span className="trailer-spinner" aria-label="Buffering" /> : state === "playing" ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
          </button>
          <button className="icon-button" aria-label="Seek forward 10 seconds" disabled={!ready || !duration} onClick={() => seekBy(10)}><RotateCw size={22} /><span>10</span></button>
        </div>
        <span className="trailer-state" role="status">{busy ? (state === "buffering" ? "Buffering…" : "Loading trailer…") : state === "ended" ? "Trailer ended" : state === "error" ? "Trailer unavailable" : state === "playing" ? "Playing" : "Paused"}</span>
        <div className="trailer-timeline">
          <time aria-label="Current time">{time(drag ?? currentTime)}</time>
          <PlayerProgress aria-label="Trailer progress" type="range" min={0} max={duration || 0} step={0.1} value={drag ?? Math.min(currentTime, duration)} disabled={!ready || !duration}
            style={{ background: `linear-gradient(to right, #ff6b3d ${duration ? (drag ?? currentTime) / duration * 100 : 0}%, #738096 0%, #738096 ${duration ? buffered / duration * 100 : 0}%, #354056 0%)` }}
            onPointerDown={() => setDrag(currentTime)}
            onChange={event => { const target = Number(event.target.value); setDrag(target); onSeek(target); }}
            onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)} onBlur={() => setDrag(null)} onKeyUp={() => setDrag(null)} />
          <time aria-label="Duration">{time(duration)}</time>
          <button className="icon-button" aria-label={muted ? "Unmute" : "Mute"} disabled={!ready} onClick={onMute}>{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
          <input className="trailer-volume" aria-label="Volume" type="range" min={0} max={100} value={muted ? 0 : volume} disabled={!ready} onChange={event => { const value = Number(event.target.value); onVolume(value); }} />
          <button className="icon-button" aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={() => void toggleFullscreen()}>{fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}</button>
        </div>
      </div>
      {!visible && <span className="trailer-show-hint" aria-hidden="true">Tap to show controls</span>}
    </div>
  );
}
