import type { Page } from "@playwright/test";
/** Stateful public-API test double. This does not establish live YouTube availability. */
export async function mockYouTube(page: Page) {
  await page.route("https://www.youtube.com/iframe_api", route => route.fulfill({
    contentType: "application/javascript",
    body: `
      window.YT = { Player: class {
        constructor(element, options) {
          this.options = options; this.state = -1; this.time = 0; this.muted = false; this.volume = 100;
          this.frame = document.createElement('iframe');
          this.frame.src = options.host + '/embed/' + options.videoId + '?' + new URLSearchParams(options.playerVars);
          element.replaceWith(this.frame); window.fixturePlayer = this;
          this.timer = setInterval(() => { if (this.state === 1) this.time = Math.min(120, this.time + .1); }, 100);
          setTimeout(() => options.events.onReady({ target: this }), 50);
        }
        getIframe() { return this.frame; }
        getCurrentTime() { return this.time; }
        getDuration() { return 120; }
        getPlayerState() { return this.state; }
        isMuted() { return this.muted; }
        getVolume() { return this.volume; }
        change(state) { this.state = state; this.options.events.onStateChange({ data: state }); }
        playVideo() { this.change(1); }
        pauseVideo() { this.change(2); }
        seekTo(seconds, allow) { this.time = seconds; this.lastSeekAhead = allow; }
        mute() { this.muted = true; }
        unMute() { this.muted = false; }
        setVolume(value) { this.volume = value; }
        destroy() { clearInterval(this.timer); this.frame.remove(); }
      }};
      window.onYouTubeIframeAPIReady();
    `,
  }));
  await page.route("https://www.youtube-nocookie.com/**", route => route.fulfill({
    contentType: "text/html",
    body: '<html><body style="background:#000;color:white;margin:0"><span style="position:absolute;bottom:12px;right:12px">YouTube attribution fixture</span></body></html>',
  }));
}
