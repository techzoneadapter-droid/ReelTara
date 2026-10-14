# Phase 3 verification — 2026-10-14

Branch: release/android-play-readiness. Overall **BLOCKED for publication**.
Fetched and fast-forwarded to upstream f7f6aae before making these changes; no reset, cleanup, main merge, production deployment or production ads enabled.

| Check | Status | Evidence |
|---|---|---|
| TypeScript / production web build | PASS | npm run qa; 281.33 kB JS, 87.79 kB gzip |
| Unit / API contract tests | PASS | 30 passing, including cache refresh lifecycle and preflight rejection |
| Full browser suite | PASS | 29 passing, including real Commons and Blender media playback |
| Web thumbnails | PASS | List, hero, details, reviewed YouTube thumbnail, free catalog, failed images and cached reload |
| Live upstream API through local backend | PASS | 8 smoke checks; IN 25 / PH 25 Wikidata films; 26 free entries; not demo fixtures |
| USB configuration tests | PASS | 8 pass, 1 explicitly skipped because 5188 is occupied by the existing preview; no listener terminated |
| Capacitor sync / Android build | PASS | npm run android:verify; debug APK, release APK, AAB, native unit task; 218 tasks executed |
| Release networking isolation | PASS | Packaged APK/AAB inspection rejects dev URL, cleartext, mixed content and debug network XML |
| Preflight rejection | PASS | npm run play intentionally exits 1: 2 PASS / 7 BLOCKED, no approval flags supplied |
| New thumbnail verification on Samsung | BLOCKED | ADB currently lists no authorized device. Earlier Phase 2 device evidence does not prove these new changes |
| Public HTTPS / installed release smoke | BLOCKED | No backend URL supplied; connected Vercel repository lookup returned no projects in the queried account scope |
| Rights, privacy, support, Data Safety, app ID, signing | BLOCKED | Owner evidence and confirmations still required |
| Approved launcher/splash artwork | FAIL | Phase 2 default Capacitor artwork remains; no invented replacement branding approval |

## Thumbnail repair

Missing artwork has several causes: open-data image rights are deliberately unverified and withheld; trailer cards used movie posters rather than reviewed video thumbnails; failed image URLs had no alternate image chain; hero/detail CSS background URLs had no image error handling. Cached records can contain missing or broken poster URLs.

Before: a missing image rendered the old text/logo fallback; broken CSS backgrounds could remain empty. After: one shared image resolver tries a safe source, poster/backdrop, reviewed YouTube video thumbnail, then the local authored SVG. Trailer cards prioritize the reviewed YouTube thumbnail. Hero and details use the same error-aware component. No metadata, playback permissions or movie artwork rights are fabricated.

Wikidata/TVmaze entries without reviewed image rights use /brand/thumbnail-placeholder.svg with ReelTara's existing title/brand treatment. All-source failures use the same placeholder. A failed URL is remembered in a bounded 200-entry, two-minute in-memory map; storage/watchlists remain intact. Images are lazy/async outside eager hero/details, and TMDB list variants retain responsive small sizes. Local placeholder backing avoids a white flash while decoding.

Files: src/utils/thumbnails.ts; src/components/ui.tsx; src/App.tsx; src/styles.css; public/brand/thumbnail-placeholder.svg; tests/browser/thumbnails.spec.ts; tests/browser/phase2.spec.ts; tests/services.test.ts.

The dedicated browser thumbnail tests use controlled fixtures and assert decoded image dimensions. Live catalog smoke and actual media playback are separate checks. No new Android FPS/RAM claim is made.

Real web screenshots were inspected for the home and Wikidata detail screens: the local SVG retains the existing layout and readable title treatment. The selected live detail was Nanakda Pagla Bhare Haranfad (upcoming 2027 metadata), not a hardcoded demo record.

## Backend changes and remaining inputs

vercel.json prepares Vite output and Node API function bundling, includes the reviewed free-source registry, and bounds functions at 60 seconds. api/health.mjs exposes no credentials. Production and development share strict native-origin CORS, method checks, Vary: Origin and no-store error behavior. Free-catalog CDN freshness is 15 minutes rather than 12 hours. In-process cache refresh is awaited, deduplicated and bounded; stale data is returned only within its grace period when refresh fails. This cache is opportunistic per process, not durable across serverless instances; CDN caching supplies shared response caching.

See BACKEND_PRODUCTION_SETUP.md for the reviewable setup and smoke commands. Need the actual HTTPS API origin, accurate published privacy/support pages, commercial content/artwork/territory evidence, reviewed Data Safety answers, permanent package ownership and secure signing verification. No API token is needed for the open catalog.

Raw local smoke evidence: ignored .cache/phase3/backend-smoke.json. Previous device measurements remain in .cache/phase2 and are explicitly historical.
