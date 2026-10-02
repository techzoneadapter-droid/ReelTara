# Dedicated player verification

The application keeps the catalog/detail tree mounted but hidden and inert while
`PlayerScreen` is active. A history entry preserves the movie, tab, filters and
detail scroll position. Both Back and browser Back return to that detail.
Commercial discovery titles are rejected at both player entry and history restore.

`FreeMoviePlayer` uses the existing legal URL/source lifecycle and progress store.
Native video controls provide play/pause, seek, time, volume/mute, fullscreen and
control auto-hiding; exact control appearance and hide timing are browser-owned.
A separate fullscreen action supports the standard API and iOS video API, with an
inline message if unavailable. The video uses `object-fit: contain` in portrait,
landscape and fullscreen. Progress persists every five seconds, on pause, on page
hide and on player teardown. Existing 95% completion behavior is retained.

Browser coverage includes real Big Buck Bunny playback and 30-second resume,
Sintel seek/pause/resume/fullscreen, real Tears of Steel playback, automatic source
fallback, ten-second source timeout, exhaustion/retry, mobile and landscape
screenshots, Dune in-app iframe, browser Back/Forward and detail scroll restoration.
The trailer integration tests use an embed fixture; they do not prove YouTube can
serve media from every deployment or network.

## Custom trailer player

`TrailerPlayer` uses the official `YT.Player` IFrame API for YouTube and an HTML5
video element for verified direct sources. YouTube uses `controls=0`, `playsinline=1`,
`rel=0`, `enablejsapi=1` and a matching origin. There is no `modestbranding` parameter.
ReelTara controls and the buffering spinner occupy a separate rail below the video;
loading and error UI also stay outside the iframe. No iframe DOM access, cropping,
masking, pointer-event interception, downloading or re-hosting is used. YouTube may
still render its own title, logo, attribution, ads or related content. `rel=0` limits
related videos to the same channel; it does not eliminate them.

The trailer has one ReelTara title in the existing top bar. An external source
link is present only during an error. Play, pause, replay, mute, volume, progress
and seeking use the provider's actual playback methods. Position, duration and
volume are sampled every 400ms while ready, including paused seeks. `onReady`,
`onStateChange`, `onError` and `onAutoplayBlocked` synchronize the API states;
an error stays latched until Retry, even if YouTube sends later state events.
The controls hide after three seconds of playing inactivity and reveal on rail
interaction or keyboard focus. Focused controls remain visible for accessibility.

Left/right double taps on the control rail seek ten seconds without covering the
YouTube viewport. Desktop double clicks, Arrow Left/Right and J/L also seek.
Fullscreen targets the existing PlayerScreen container and preserves the mounted
player and its playback position. Browsers without container fullscreen use that
same container in the viewport; Escape exits this fallback without closing the
player. Free Movie playback/UI is unchanged.

Trailer selection prefers verified official direct trailers, official YouTube
trailers, official teasers, then explicitly verified fallbacks. Unreviewed fan
uploads are excluded. Direct URLs require a reviewed `verified` flag, source page,
HTTPS URL within the existing legal domain allowlist, and a supported video MIME
type. No new production direct URL was invented or scraped. Direct-mode tests
serve only the original local WebM fixture through a range-aware test route.

Browser trailer tests cover Dune's entry/Back, supported iframe parameters, current
time progression, pause, seek, mute/volume, buffering/ended/error states, retry,
auto-hide/reveal, desktop and mobile double tap, native container fullscreen,
viewport fullscreen fallback, and unobstructed iframe bounds. Direct-mode coverage
uses actual HTML5 playback, custom pause/seek and container fullscreen. The YouTube
API fixture verifies our integration, not live YouTube media delivery.

Live Dune verification reached YouTube's official embed, which displayed
“Sign in to confirm you're not a bot.” It blocked real playback verification in
this sandbox. The challenge/branding stayed visible; the fallback appeared below
the iframe. No authentication or bot challenge bypass was attempted.

Trailer screenshots are in `.cache/trailer-custom-desktop.png`,
`.cache/trailer-custom-mobile.png`, `.cache/trailer-custom-landscape.png`,
`.cache/trailer-custom-fullscreen.png` and `.cache/trailer-custom-live.png`.

Official references:
- [Supported player parameters](https://developers.google.com/youtube/player_parameters)
- [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference)
- [Required minimum functionality](https://developers.google.com/youtube/terms/required-minimum-functionality)

Earlier player-only validation (before the finalization request): no commit or push was performed, following the then-current worktree instruction. `git fetch
origin` succeeded; the fetched `origin/main` is
`df0d4f17a451e30bc184c36dcf168c6ac7d093d7`. This reference does not include the
uncommitted trailer changes.

Earlier player-only validation: `npm run qa` passed (10 service tests, 17 browser tests and
production build). A separate `npm run build` passed. `git diff --check` passed.
Desktop, mobile portrait, landscape and container fullscreen trailer screenshots
were visually inspected. The final live check confirmed `data-player-state=error`
while YouTube displayed its bot challenge.
