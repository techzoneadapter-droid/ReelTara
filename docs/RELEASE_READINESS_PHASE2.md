# ReelTara — Phase 2 release readiness

Date: 2026-10-13 (Asia/Saigon). Branch: `release/android-play-readiness`.

Overall: **BLOCKED for Google Play submission**, regardless of successful development QA. No upload, main merge, new ad SDK, invented account details, rights approval or production deployment is performed.

## Scope and reproducibility

Measured on Samsung SM-T385K, Android 9/API 28, WebView 101, `navigator.deviceMemory=2`, USB localhost:5188. Measurements are **Vite development / cold app process with existing disk/API caches**, not signed-release startup benchmarks or a fleet-wide performance guarantee. The observer and ADB polling add overhead. Per-run network/cache/device conditions differ.

Run `npm run android:usb`, then `npm run android:device:qa`. Optional PowerShell labels: `$env:QA_LABEL='after'`. Raw evidence is ignored under `.cache/phase2/`: JSON navigation/resource/DOM/rAF metrics, Android `dumpsys meminfo`, `gfxinfo` and filtered error logs. `.cache/catalog/live-verification.json` is real upstream API evidence; browser fixtures are explicitly separate.

## Performance observations

| Measurement | Baseline | Temporary blur-disabled trial | Interpretation |
|---|---:|---:|---|
| Android activity TotalTime | 2651 ms | 2909 ms | Actual `am start -W`; includes native activity launch, not catalog readiness |
| First UI observed | 5015 ms | 9994 ms | Startup varied; no verified startup improvement claimed |
| FCP | 3105 ms | 7825 ms | Dev build, different warm/cache/network conditions |
| Discover tab / detail / Free tab | 1114 / 544 / 830 ms | 1120 / 497 / 846 ms | End-to-end automation includes polling; not INP |
| Next-page waits | 3806–6794 ms | 2838–6609 ms | Upstream SPARQL latency motivates bounded batch caching |
| Scroll rAF median / p95 | 50.081 / 66.790 ms | 16.708 / 16.709 ms | Observed callbacks during scripted 4-second scroll; **not physical display FPS** |
| Scroll callback samples >32 ms | 80/92 | 6/227 | Strong evidence of backdrop compositing cost on this device |
| Mounted cards while scrolling | 12 of 300 real titles | 16 of 300 real titles | Viewport plus overscan; real data, no 300-card DOM |
| Main app TOTAL PSS | 182470 KiB | 142043 KiB | Android process snapshot, not total app+renderer RAM or leak proof |
| Android gfxinfo janky frames | 128/145 (88.28%) | 34/280 (12.14%) | Whole sampled activity session, not scroll-only tracing |

Changes: blur disabled only on Android reporting <=2 GB deviceMemory; existing layout/colors/cards retained. Wikidata caches one bounded 101-row query for four 25-row UI pages, reducing repeated upstream work without polling or speculative requests. Commons list thumbnails are requested at 240 px instead of 500 px; cache version changed. Original creator thumbnails already lazy-load; unreviewed open-data posters remain withheld. Offline open metadata is retained for at most 24 hours past expiry, explicitly labelled cached; playback/license checks never use expired authorization. Reconnect fetches fresh metadata and preserves user storage.

Native sync/build now share a workspace lock, preventing the observed race where concurrent Capacitor sync removed plugin intermediates during Gradle. `npm run android:sync` and `npm run android:verify` use the lock; direct external `cap`/Gradle invocations are outside this coordinator. A crashed-owner PID is checked with signal 0 (existence only; no process is terminated). The preview remains responsive while it waits for the lock. Use the npm commands for coordinated builds.

## PASS / FAIL / BLOCKED audit

| Area | Status | Evidence / action |
|---|---|---|
| Safe Git sync | PASS | Started clean on correct branch, fetched and fast-forward check found no new commits; prior local backup/stash retained |
| Real Wikidata/TVmaze | PASS | Actual IN/PH film pages 1/2, current episode schedules and Sacred Games search returned nonempty upstream responses after batch optimization |
| Discovery/full-movie separation | PASS | Real Wikidata detail has no Watch Free action; metadata never grants media rights |
| Pagination/DOM | PASS | 300 actual titles measured on Samsung with 12–16 cards mounted; 500-fixture desktop/mobile browser tests remain separate scale checks |
| Offline/online, image errors, retry/probe fallback | PASS | Browser tests retain cached metadata/label, refresh after reconnect, preserve user sentinel and replace failed images with existing fallback; media tests exercise timeouts and retry |
| Browser regression suite | PASS | 26/26 in full run, including actual Commons/Blender mirror streams and trailer control fixtures |
| TypeScript/unit/integration | PASS | tsc web builds; 25 service/open-catalog tests passed; USB build-lock test run recorded below |
| Original creator/free-source stream transport | PASS | Actual browser playback of Miñocas, Big Buck Bunny, Sintel, Tears of Steel and Lost Flower in this session; transport success does not confer ownership |
| Commercial full-film/poster/trailer rights | BLOCKED | Need per-asset rights/provenance and permitted territories/ads use. Existing local commercial posters/hero images have no supplied rights dossier. Official uploader/embed availability is not commercial authorization. Commons metadata checks are technical eligibility, not independent legal approval |
| Wikidata/TVmaze metadata licensing | PASS (technical attribution) / BLOCKED (owner release review) | CC0 text and CC BY-SA API metadata attributed; API photo rights remain separate; approve share-alike/derivative database obligations for intended commercial use |
| Ad integration / declarations | BLOCKED | No AdMob/analytics/billing SDK detected. Owner must choose monetization/consent/target audience and accurate Contains ads/Data Safety answers, including YouTube's possible ad behavior |
| Privacy policy/Data Safety | BLOCKED | No verified public policy URL or in-app privacy surface/contact. [Draft inventory](DATA_SAFETY_DRAFT.md) describes local storage, Android backup, backend logs, YouTube/media/Google Fonts network access; not a submitted declaration |
| Accounts/deletion | PASS for current no-account architecture / BLOCKED if introduced | Local profile is not authentication. Future account creation requires both in-app and public web deletion mechanisms |
| Native branding | FAIL | Visually inspected launcher icon and splash are the default Capacitor blue mark/white screen. Replace using owner-approved ReelTara assets before store review; no redesign or ownership assumption performed |
| Package/version/signing | BLOCKED for publication | `com.reeltara.app`, debug `.debug`, versionCode 1/versionName 1.0 unchanged. Confirm Play ownership/unique package and highest uploaded versionCode; no release signing credentials configured |
| Production online backend | BLOCKED | Bundled app cannot run server handlers. Supply verified HTTPS backend/API base/CORS/log policy and test release against it; localhost USB success is not production proof |
| New Android/edge-to-edge/16-KB environment | BLOCKED | Only Android 9 hardware connected. Android 16 target behavior and newer WebView/network conditions still require real-device/internal-track QA |

## Policy references reviewed

- [Current Play target API requirements](https://developer.android.com/google/play/requirements/target-sdk): new apps/updates require API 36 from 2026-08-31. This branch was API 35; compile/target moved to 36 with AGP 8.10.1 and existing Gradle 8.11.1. Final build/artifact results are recorded below.
- [AGP 8.10 compatibility](https://developer.android.com/build/releases/agp-8-10-0-release-notes), [minimum AGP by API](https://developer.android.com/build/releases/about-agp).
- [User Data, privacy and Data Safety](https://support.google.com/googleplay/android-developer/answer/10144311), [Ads](https://support.google.com/googleplay/android-developer/answer/9857753), [review/app content declarations](https://support.google.com/googleplay/android-developer/answer/9859455).
- [YouTube Required Minimum Functionality](https://developers.google.com/youtube/terms/required-minimum-functionality): keep player viewport unobstructed, branding/links and YouTube ad functionality intact; do not sell access to YouTube playback. Planned advertising adjacent to third-party video needs owner review; existing controls stay outside the iframe.
- [Wikidata licensing](https://www.wikidata.org/wiki/Wikidata:Licensing), [TVmaze API/licensing](https://www.tvmaze.com/api), [Google Play intellectual property](https://support.google.com/googleplay/android-developer/answer/9888072).

## Information needed from owner

1. Rights dossier for bundled posters/hero art, brand assets, each trailer/full-film source, commercial/advertising use and territories; no token or invented license will replace it.
2. Developer legal/display name, privacy contact/support URL, reviewed public privacy policy and target audience/content rating/countries.
3. Final HTTPS backend and logging/retention policy; ad/consent model and any SDK choice.
4. Play account/app ownership, signing method and maximum versionCode already uploaded. Keep private keys/passwords outside Git/chat.

Release remains BLOCKED until these are resolved and signed-release/new-device tests pass.

## Final verified state after implementation

- **PASS**: TypeScript and web build (279.71 KB JS before USB's development API-base override; ~87.27 KB gzip), Capacitor sync, debug APK, unsigned release APK, release AAB, Gradle `testDebugUnitTest` and release vital lint. Native unit XML contains one default Capacitor `ExampleUnitTest`, not application business-logic coverage. Service/open-catalog tests **25/25**; USB/native-lock tests **9/9**; final browser suite **26/26**.
- **PASS**: Packaged release `compileSdkVersion=36`, `targetSdkVersion=36`, minSdk 23, package `com.reeltara.app`, versionCode 1/versionName 1.0. Only INTERNET and the AndroidX app-defined signature receiver permission were present; no camera/location/contacts/storage/AD_ID permission. Release APK/AAB config/resources/manifests contain no HTTP live reload URL, debug network-security resource or server token variable. ZIP inspection found zero `.so` files in both release APK and AAB; full 16-KB/new-device certification remains BLOCKED until target-device testing.
- **PASS**: USB preview restored on **5188**, upgraded development APK installed/launched on SM-T385K. CSS HMR and React Refresh passed without full reload, APK rebuild or runtime exceptions during the probe. The latest actual catalog is `live` with 73 open items at startup; 300 unique browse items were reached through real API pagination.
- **PASS**: Actual Android WebView Big Buck Bunny playback reached duration **596.504 s**, currentTime **1.464 s**, paused=false, readyState=4 from the reviewed Archive mirror. Real Dune YouTube embed reached `playing`, viewport about 602×338, controls outside iframe. These are transport/player checks, not blanket commercial rights approval.
- **PASS with limits**: After implementation, activity TotalTime **2637 ms**, first observed UI **5438 ms**, FCP **3462 ms**, Discover **1087 ms**, detail **491 ms**, Free tab **848 ms**. Startup remains a development-build bottleneck/variable result; signed-release startup and deployed backend remain BLOCKED, so no startup speedup is claimed.
- **PASS with limits**: Cached next-page waits **266–421 ms**; upstream/block-miss waits **4497–5184 ms**. Four-page batching removed repeated upstream queries, but does not make uncached SPARQL instant. Tests verify one upstream request for four UI pages, no duplicate IDs, then a second request for the next block.
- **PASS with limits**: Final scroll observation: **228 rAF samples / 4.029 s**, median **16.709 ms**, p95 **16.710 ms**, **7** intervals >32 ms, **18** mounted cards / **300** real titles and **573** total DOM elements. The scripted scroll moves 12 px per callback, so faster callbacks also travel farther; this is an observed responsiveness check, not a controlled display-FPS benchmark. Main process PSS **147619 KiB**, Graphics **78320 KiB**; Android gfxinfo jank **38/299 (12.71%)** across the sampled session. Baseline/trial/final are individual snapshots, not memory-leak or total renderer-RAM conclusions.
- **PASS with limits**: A Commons list thumbnail previously used 500 px; the 240-px API request was normalized by Commons to a canonical **250-px** URL. Images remain lazy; an offscreen/pending image can have naturalWidth=0 and is not counted as a decoded-image success. Broken-image fallback is separately browser-tested.
- Filtered Android/WebView error logs for the final performance run were empty apart from buffer headers. This is bounded log evidence, not proof that all possible errors are absent.

Initial native build failures were caused by concurrent sync removing plugin intermediates; the workspace lock and a sequential rerun produced successful final artifacts. The temporary interruption/restart applied only to the verified ReelTara preview process. No other application's listener/process was stopped. The earlier permission-review usage-limit rejection delayed the blur trial; the user resumed work and the same authorized trial later executed successfully.

All FAIL/BLOCKED rows above remain actionable release gates. A built AAB is not a signed, production-tested or legally approved submission.
