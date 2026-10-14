# ReelTara — Phase 5 final verification and handoff

2026-10-14 · `release/android-play-readiness` · baseline `c3852af`.

**Overall: FAIL — not fully cleared.** Artwork, actual-device screens, USB HMR, TypeScript/web/native builds pass. One real-media integration case remains unresolved: Sintel playback after seeking to 30 seconds times out. Do not treat this report as full completion or Play release approval.

## Results

| Check | Status | Evidence |
|---|---|---|
| Git preservation/synchronization | PASS | Clean at start; origin fetched, fast-forward already up to date; latest remote check 0 ahead / 0 behind before commit. No reset/clean/main merge. |
| TypeScript + production web build | PASS | `tsc -b`, Vite: 286.46 kB JS / 89.50 kB gzip. |
| Unit / API-contract tests | PASS | Final 36 passed, zero failed. |
| Full browser integration suite | FAIL | Last complete run: 31/32 passed. Remaining Sintel case; focused recheck also failed after strengthening the seek assertion. |
| Real catalog/backend | PASS | Eight loopback smoke checks; Wikidata IN 25, PH 25, legal-free catalog 26; CORS/method/unreviewed-playback guards pass. This does not verify deployed HTTPS. |
| Licensed image HTTP responses | PASS | 23/23 real Commons thumbnail URLs returned image data; zero failed. |
| Web and Samsung artwork | PASS | 23 unique licensed free-film images decoded on each platform; all five featured images decoded and changed; list/detail/trailer screens checked. |
| Discover / country lists | PASS | Featured 50, IN 25, PH 25; rendered titles match source API IDs/titles, rather than seed/demo records. |
| Capacitor sync / Android debug build | PASS | Fresh final-source sync and `assembleDebug`: 86 tasks, 24 executed, 62 up to date. |
| USB script tests | PASS | Eight passed; one explicitly skipped because 5188 already has a listener. No listener terminated. |
| Actual Samsung HMR | PASS | 15:44:53Z, SM-T385K / Android 9 / API 28 / WebView 101, localhost:5188. CSS HMR and React Refresh; no full reload, APK rebuild or collected runtime error during probe. |
| Development/release network separation | PASS | Fresh debug package and existing release APK/AAB inspected; release has no development server/cleartext/debug network resource. Release artifacts were not rebuilt or published in this handoff. |
| Google Play preflight | BLOCKED | Two pass, seven blocked; no approval flags set. |

## Actual images and limits

The loaded Home snapshot has **132 distinct records: 24 licensed image sources, 3 existing local images, 105 default artworks**. These are source-availability counts, not a claim that all 24 were decoded in this pass.

The free catalog has 26 films. **23 have real Commons artwork with per-file source/license/artist evidence, and all 23 decoded on both web and Samsung.** These include film-frame thumbnails, not necessarily theatrical posters. The extra licensed discovery source is the previously resolved Amanpour illustration; it does not grant television playback rights. Three existing Blender/local images are excluded from verified-image totals pending image-rights review.

All five actual Hero images decoded: Lost Flower, Urraca, The Day I Helped Save the World, Seaside, The Interview. Detail artwork decoded at 960×640; four reviewed YouTube thumbnails decoded at 480×360 on Samsung. No image-error events were recorded in the checked UI flows. Zero failed thumbnail HTTP responses applies to the 23 checked licensed URLs, not every possible future/offscreen image.

India/Philippines items lacking licensed artwork retain the branded `/brand/thumbnail-placeholder.svg`. The sampled first 25 entries in each list remain discoverable; no film was deleted to improve image counts. Machine-readable licensing evidence is not fabricated owner clearance for ads, territories, music, trademarks or performers.

## Technical fixes made during verification

- Vite watched newly written QA PNGs and crashed with Windows `EBUSY`. Documents and generated test reports are now outside its watch scope. An exclusively locked QA PNG no longer interrupts the preview's health response; React/CSS remain watched.
- QA screenshots now have a bounded ADB fallback, restricted to foreground ReelTara, for older WebViews whose CDP screenshot call stalls. Connection/reload requests are bounded. QA verifies source-backed country titles, respects the existing country preference, and checks all five actual Hero images.
- Media probes previously consumed the same timer as metadata loading. The server media-header probe now allows nine seconds, below the client ten-second limit; startup and supported-range seeks allow twenty seconds, while ordinary playback buffering remains ten seconds.
- Authorized media uses the backend-verified final HTTPS URL to avoid repeating Archive redirects. A separate provider-boundary check rejects cross-provider, credentialed, non-HTTPS and nonstandard-port destinations. General link/candidate permissions and commercial-film playback restrictions are unchanged.
- Initial explicit player autoplay intent survives a failed first source. User pauses still stop that intent. Supported-range seeks preserve the requested position instead of being reset after four seconds. Tests require real video-time advancement and actual playback beyond 30 seconds, rather than elapsed wall time or an instantaneous seek assignment.

The slow regression uses original test-only canvas media: six-second probe plus twelve-second media delay, verified final URL and autonomous playback. It is separate from real-public-media integration results. Earlier public MP4 failures were investigated with event timelines; they were not skipped, mocked into successes or treated as poster failures. Bunny resume/seek/reload, Tears of Steel, failover/Retry and a hung-probe failover passed in the last full run. **Sintel's strengthened seek flow remains FAIL**, with the player offering Retry / View Legal Source. Its sources can return HTTP 206 video headers while later media/range delivery stalls; this is not proof that those full streams are healthy.

## Remaining blockers

1. Reproduce and resolve the real Sintel seek failure before declaring the whole integration suite green. A positive one-byte HTTP probe is insufficient. No guaranteed alternative stream was invented; the checked official Blender download directories returned HTTP 403 in this environment.
2. Many commercial IN/PH films still have no verified licensed image. Defaults remain accurate; this is not an “all movies now have real posters” claim.
3. Production needs actual public HTTPS backend, privacy-policy and support URLs (`VITE_PUBLIC_API_BASE_URL`, `PLAY_PRIVACY_POLICY_URL`, `PLAY_SUPPORT_URL`). Owner evidence/approval is missing for commercial content/artwork/ads rights, Data Safety, permanent application ID and secure release signing. Existing preflight confirmations must only reflect real review; no flags were changed to bypass it.
4. Newer physical Android devices and fresh FPS/RAM benchmarks were not tested. Default native store branding also still needs the prior release review. No production deployment, AdMob production, main merge or Google Play submission occurred.

## Samsung check and reproducible evidence

Preview remains running at **5188**. On the connected, unlocked Samsung, open ReelTara → Home; change all five Hero slides → Discover → choose Films from India / Philippines → Free → open a Commons film detail → Hot Trailers. Check image/source credits and the fallback distinction. Movie pictures are not automatically started as videos.

For a future stopped session, connect USB with debugging authorized and run only `npm run android:usb`. Do not start a second preview for this same working directory while its current session is running. React/CSS saves update through HMR; only native/plugin/config changes need native rebuilding.

Recheck with `npm run qa`, `node scripts/check-cinematic-web.mjs`, `node scripts/check-cinematic-device.mjs --phase5`, `node scripts/verify-artwork.mjs`, `node scripts/backend-smoke.mjs --local` and `node scripts/check-android-device.mjs`. Device checks refresh only this app's API cache, preserve watchlists, allocate/remove their own DevTools forward and restore their temporary HMR source probes.

Persistent evidence: [results.json](qa/phase5/results.json), [Samsung Home](qa/phase5/home-android.png), [Free list](qa/phase5/free-android.png), [India](qa/phase5/country_IN-android.png), [Philippines](qa/phase5/country_PH-android.png), [Detail](qa/phase5/detail-android.png), [Trailers](qa/phase5/trailers-android.png). Additional desktop/mobile screenshots and diagnostics remain under ignored `.cache/phase5`. The commit containing this report is the handoff commit; its SHA is supplied in the final response and branch history.
