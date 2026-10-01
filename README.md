# ReelTara

React + TypeScript + Vite. Existing branding, layouts and card sizes are preserved. Typography uses Inter Tight (headings/titles) and Inter (body/controls), with swap and system fallbacks. Additions are functional loading/error feedback, country preference, availability, Continue Watching and a media dialog.

## Run

```sh
npm install
npm run dev
npm run qa
npm run build
```

The app works without credentials using the existing curated catalog. For live discovery, set `TMDB_READ_ACCESS_TOKEN` in the **server process environment** before starting Vite, or in Vercel project settings. `.env.example` documents the variable; Vite deliberately does not load secrets into the client. No `VITE_` secret is used. Restart the dev server after configuring it.

`api/tmdb.mjs` is a Vercel server function; `server/tmdb.mjs` shares its fixed upstream allowlist with Vite development middleware. A static-only host must provide an equivalent `/api/tmdb` endpoint; otherwise the app remains in fallback mode. `vite preview` does not run the server function. The proxy supports only public movie metadata endpoints, bounds search length, excludes adult search results, uses a server timeout and never returns its token.

## Data and adapters

- `src/types/movie.ts`: movies/details, genres, credits, trailers, providers, licensed streams, search, history/progress, entitlement.
- `src/adapters/tmdb.ts`: trending, popular, now playing, upcoming, genres, title search, details, credits, videos, country-specific providers. Only details selected by the user are fetched.
- `src/services/catalog.ts`: adapter facade, per-country cache, partial failure handling, fallback catalog, local search.
- `src/adapters/archive.ts`: metadata and compatible MP4 selection for explicitly reviewed Internet Archive items. Both a reviewed item and recognized open license metadata are required; an arbitrary Archive upload is never sufficient proof of rights. The initial reviewed item is Big Buck Bunny. Metadata failure falls back to the creator source; an item with no compatible file becomes source-only.
- `src/data/movies.ts`: existing curated fallback plus original creator URLs and CC BY 3.0 attribution for Blender open films. Sintel is source-only because its configured original download is MKV; incompatible containers are not advertised as playable.
- `src/services/http.ts`: eight-second request timeout, AbortController, at most one retry, validation, bounded TTL cache and request deduplication. Hooks ignore superseded responses, allowing shared requests to complete safely.
- `src/utils/legal.ts`: HTTPS/domain validation, official trailer ordering and free-playback gate. Discovery content never has a full-movie playback action.

Provider data comes from [TMDB / JustWatch](https://developer.themoviedb.org/reference/movie-watch-providers). Those results provide a TMDB watch-page link, not direct provider deep links. The UI shows free/ads/subscription/rent/buy exactly as supplied, scoped to IN or PH. Empty availability is distinct from unavailable API. Fallback Apple TV links are explicitly catalog searches, never asserted regional availability.

Internet Archive uses its documented [metadata endpoint](https://archive.org/developers/md-read.html). Creator sources: [Big Buck Bunny](https://peach.blender.org/), [Sintel](https://durian.blender.org/), [Tears of Steel](https://mango.blender.org/). Full films are streamed from their original source, never downloaded or re-hosted by the app. No DRM bypass, stream scraping, ads SDK or billing integration is included.

## Local state and navigation

`UserStateRepository` separates persistence from the UI. `LocalUserStateRepository` stores version 1 under `reeltara-user-v1`, validates records, recovers from malformed/unavailable storage, and migrates the legacy watchlist. It stores movie snapshots so saved API movies survive reload, plus viewed/trailer history, country and playback progress. Cloud synchronization can replace the repository later.

Progress saves every five seconds, on seek/pause/close and page hide. At 95% or ended it is completed; completed titles restart from zero and leave Continue Watching. Native video controls supply seek, volume and fullscreen where supported. Player errors offer retry and the original source. YouTube uses its official embed with a legal external fallback; embedding restrictions remain controlled by YouTube.

History entries track detail/player transitions. Back returns to the originating tab, query and scroll. Tabs remember their filters. Watchlist and country changes sync across browser tabs. Storage failures remain usable in memory and show feedback.

`Entitlement` and `DisabledAdService` are architecture placeholders only. No premium purchase or advertising UI is added.

## QA

`npm run qa` runs service tests, Playwright core flows, then the production build. The browser runtime and supporting libraries are extracted under ignored `.cache/`, avoiding system package installation. The included bundled browser targets Linux x64 (the sandbox/CI platform).

Tests cover legal gating, trailer ordering, missing metadata, cache/deduplication/retry, proxy allowlist, migration/corrupt storage, completion rules, and browser flows A–H plus mobile layout. TMDB, Archive and YouTube responses are controlled fixtures; video playback uses a short original canvas video fixture with duration and seek metadata, exercising actual HTML video playback, progress, resume and restart without relying on a third-party CDN.

Live TMDB verification requires the server token. Third-party source/embed availability must also be checked in the deployment network and target countries. During this sandbox session, direct Blender requests returned HTTP 403, so fixture playback is not proof of live CDN accessibility.

## Phase 2 refinements

Adapter implementations live in `src/adapters/`; legacy service imports remain compatible. The versioned local repository is in `src/storage/userState.ts`. Legal URL and playback policies live in `src/utils/legal.ts`. PlaybackService also enforces the legal playback boundary before saving progress. `EntitlementService` exposes free capabilities until verified billing exists.

The provider picker reuses the media dialog styling, groups regional providers, and confirms the real destination before opening a new tab. TMDB supplies an availability-page URL, not provider-specific links; the UI explicitly labels that intermediate destination. Direct provider redirects remain dependent on a licensed provider-link data source. Logos are mapped from TMDB. Archive file selection excludes trailers/previews and private files and ranks H.264 before MPEG4 before other MP4 files.

No credentials were read during verification. Fixture tests verify the implementation, not current third-party availability or successful playback of actual YouTube trailers. No commit or push is performed under the repository working-tree-only instruction.

Archive metadata uses the same-origin `/api/archive` endpoint (`server/archive.mjs`, `api/archive.mjs`) with a fixed reviewed identifier allowlist and timeout. Movie bytes never pass through this endpoint. Both generic and US-ported CC BY 3.0 metadata are recognized; browser requests no longer depend on Archive metadata CORS behavior.

Final live smoke check: the Archive metadata proxy returned 200, Big Buck Bunny streamed from Archive in the in-app HTML5 player for 31 seconds (596.42-second duration), and reopening resumed at 31.19 seconds. The creator CDN still returned 403 from this sandbox; Archive playback succeeded. Live TMDB returned `api_unavailable`; configure the server token before validating current regional availability. YouTube embed lifecycle is fixture-tested; live YouTube playback remains unverified.
