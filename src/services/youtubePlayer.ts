/** The public YouTube IFrame API only; never access the iframe's DOM. */
export interface YouTubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getVolume(): number;
  setVolume(volume: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
}
interface PlayerOptions {
  host: string;
  videoId: string;
  playerVars: Record<string, number | string>;
  events: {
    onReady(event: { target: YouTubePlayer }): void;
    onStateChange(event: { data: number }): void;
    onError(event: { data: number }): void;
    onAutoplayBlocked(): void;
  };
}
interface YouTubeAPI {
  Player: new (element: HTMLElement, options: PlayerOptions) => YouTubePlayer;
}
declare global {
  interface Window {
    YT?: YouTubeAPI;
    onYouTubeIframeAPIReady?: () => void;
  }
}
let pending: Promise<YouTubeAPI> | undefined;
export function loadYouTubeAPI(): Promise<YouTubeAPI> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (pending) return pending;
  pending = new Promise<YouTubeAPI>((resolve, reject) => {
    const script = document.createElement("script");
    const previous = window.onYouTubeIframeAPIReady;
    const finish = (error?: Error) => {
      clearTimeout(timer);
      window.onYouTubeIframeAPIReady = previous;
      if (error) {
        script.remove();
        pending = undefined;
        reject(error);
      } else resolve(window.YT!);
    };
    const timer = window.setTimeout(() => finish(new Error("YouTube API timed out")), 15000);
    window.onYouTubeIframeAPIReady = () => {
      finish();
      previous?.();
    };
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => finish(new Error("YouTube API unavailable"));
    document.head.append(script);
  });
  return pending;
}
