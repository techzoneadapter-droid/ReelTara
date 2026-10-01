# Free Legal playback verification

Scope: playback only. No CSS, layout, branding, typography or artwork changes.

## Diagnosis (2026-10-01 UTC)

The old curated Big Buck Bunny source was:

- sourcePageUrl: `https://peach.blender.org/`
- playbackUrl: `https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_640x360.m4v`
- HTTP status: **403** (Cloudflare challenge).
- Redirect destination: none; final URL unchanged.
- Content-Type: `text/html; charset=UTF-8`.
- Content-Length: `61562`.
- Accept-Ranges: absent.
- Access-Control-Allow-Origin: absent.
- Browser video error: **4 / MEDIA_ERR_SRC_NOT_SUPPORTED**.
- Browser message: `MEDIA_ELEMENT_ERROR: Format error`.
- duration: NaN; currentTime: 0.

Previously, the details service could replace this with the Archive `BigBuckBunny_328` derivative when metadata succeeded. That direct Archive MP4 does play; the unavailable metadata path fell back to the blocked Blender URL. The new reviewed registry eliminates that dependency and refreshes stale saved movie records when opening details. Sintel previously used MKV (rejected by the app's playback guard); Tears of Steel used MOV.

Official Blender download host was blocked during verification. Google sample-bucket URLs were also tested and returned 403; none are included. Selected Archive mirrors contain the Blender open films and carry CC BY 3.0 metadata. They are legal mirrors, not claimed to be uploads authenticated as belonging to Blender staff. Existing Blender attribution and license links remain.

## Selected files and HTTP evidence

`node scripts/verify-free-sources.mjs` fetches Archive metadata/files, checks MP4 format/filename and license, then probes each exact reviewed URL. Probe responses are bounded range requests; movie bytes are never relayed to the client. All six returned `206`, `video/mp4`, `Content-Length: 1`, with a valid `Content-Range`. Accept-Ranges and CORS headers were absent on these responses; the successful 206 verifies range support. The video does not set crossOrigin.

### bunny — Content/big_buck_bunny_720p_surround.mp4

- Official page: https://peach.blender.org/
- Direct media: https://archive.org/download/BigBuckBunny_124/Content%2Fbig_buck_bunny_720p_surround.mp4
- Observed redirect destination: https://dn710604.ca.archive.org/0/items/BigBuckBunny_124/Content%2Fbig_buck_bunny_720p_surround.mp4
- Format: h.264; total size: 61878609 bytes.
- Content-Range: `bytes 0-0/61878609`.

### bunny — BigBuckBunny_512kb.mp4

- Official page: https://peach.blender.org/
- Direct media: https://archive.org/download/BigBuckBunny_328/BigBuckBunny_512kb.mp4
- Observed redirect destination: https://dn801203.us.archive.org/0/items/BigBuckBunny_328/BigBuckBunny_512kb.mp4
- Format: 512Kb MPEG4; total size: 43315070 bytes.
- Content-Range: `bytes 0-0/43315070`.

### sintel — sintel-2048-stereo_512kb.mp4

- Official page: https://durian.blender.org/
- Direct media: https://archive.org/download/Sintel/sintel-2048-stereo_512kb.mp4
- Observed redirect destination: https://dn601208.us.archive.org/0/items/Sintel/sintel-2048-stereo_512kb.mp4
- Format: 512Kb MPEG4; total size: 77410288 bytes.
- Content-Range: `bytes 0-0/77410288`.

### sintel — sintel-2048-stereo.mp4

- Official page: https://durian.blender.org/
- Direct media: https://archive.org/download/Sintel/sintel-2048-stereo.mp4
- Observed redirect destination: https://dn720709.ca.archive.org/0/items/Sintel/sintel-2048-stereo.mp4
- Format: MPEG4; total size: 282690045 bytes.
- Content-Range: `bytes 0-0/282690045`.

### steel — tears_of_steel_720p.mp4

- Official page: https://mango.blender.org/
- Direct media: https://archive.org/download/Tears-of-Steel/tears_of_steel_720p.mp4
- Observed redirect destination: https://dn710301.ca.archive.org/0/items/Tears-of-Steel/tears_of_steel_720p.mp4
- Format: h.264; total size: 76435802 bytes.
- Content-Range: `bytes 0-0/76435802`.

### steel — tears_of_steel_1080p.mp4

- Official page: https://mango.blender.org/
- Direct media: https://archive.org/download/Tears-of-Steel/tears_of_steel_1080p.mp4
- Observed redirect destination: https://dn600309.us.archive.org/0/items/Tears-of-Steel/tears_of_steel_1080p.mp4
- Format: h.264; total size: 76119705 bytes.
- Content-Range: `bytes 0-0/76119705`.

## Implementation and reproducible checks

- `src/data/freeSources.json`, `src/data/movies.ts`, `src/types/movie.ts`: exact reviewed primary/fallback URLs, typed freeSource records, compatibility aliases and legal attribution.
- `server/playback.mjs`, `api/playback.mjs`, `vite.config.ts`: same bounded probe in production and development; exact URL allowlist, HTTPS Archive-only redirects, deadline and response cancellation. A 200 video response without ranges is allowed; browser metadata is the final compatibility check.
- `src/services/freePlayback.ts`: sequential MP4 sources, HTTP probe, 10-second deadline, metadata validation, media event/error diagnostics, stale-event cancellation, runtime fallback, seek failure recovery, no CORS requirement.
- `src/components/Player.tsx`: existing controls/modal, actual source-reset Retry, official View Source, saved progress.
- `src/services/catalog.ts`: use reviewed current sources instead of overwriting with a single live metadata result.
- `src/adapters/archive.ts`: require both MP4 filename and H.264/MPEG4/MP4 format for Archive selection.
- `tests/services.test.ts`: legal boundaries, probe response validation, bounded body cancellation, redirect rejection.
- `tests/browser/free-playback.spec.ts`: real network media, positive duration, advancing time, playing event, seek to 30s, pause/resume, 25 seconds watching then reopen, reload, actual View Source popup, forced source failure, exhaustion, Retry, and 10-second timeout fallback.
- `tests/browser/core.spec.ts`: existing regression suite updated for the new media source and error wording. Its small local WebM fixture remains a deterministic progress regression test, not evidence for real MP4 playback.

Commands: `node scripts/verify-free-sources.mjs`, `npm run qa`, `npm run build`.

Runtime diagnostics use `[Free Legal playback]` and include the source page, requested/final media URL, HTTP fields, media error code/name/message, metadata duration and playing events. Archive redirect hosts may vary by region/time. Real-media tests require network access.
