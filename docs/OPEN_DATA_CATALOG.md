# Open-data catalog (API budget: zero)

Run `npm run android:usb`, then `npm run catalog:verify`. No TMDB account, API key or paid subscription is required for the default discovery engine.

- Wikidata structured metadata is CC0. Country-bound queries prioritize India (Q668) and Philippines (Q928), return release dates, director, genres and countries, and group duplicate release statements before pagination. Search is scoped to the selected country. Upcoming dates are database statements, not a guarantee of theatrical release or current popularity.
- TVmaze public metadata is CC BY-SA. Source links and attribution are displayed in the existing footer and detail view. Show descriptions are stripped of markup. Posters/backdrops are withheld: API metadata licensing alone does not establish photograph rights.
- Each catalog page contains up to 25 items per source; 50 pages support hundreds of titles. TVmaze's 250-ID index pages are consumed in ten chunks, including sparse pages. A missing provider page ends pagination. Page count 50 is a safety ceiling, not a claimed exact total.
- Current TV episodes come from the selected-country schedule plus global streaming schedule. Episode lists/cast load only when a TV show is selected. Global programs are not claimed to originate in India or Philippines.
- Index/query responses cache for one hour/15 minutes; TV index batches cache for one day. Concurrent loads deduplicate; source calls are serialized with spacing, 20-second timeouts and 429 cooldown. Errors are not cached as successful catalogs. Partial success keeps usable data. The app refreshes visible online sessions every five minutes; it does not run a background paid job.
- Trending/Popular retain existing UI but rank available metadata ratings; these are not box-office charts. Now Playing includes current TV schedules and recent film metadata, not independently verified cinema availability. Hot Trailers uses the reviewed official YouTube registry; there is no invented automatic trailer lookup. The app does not depend on legacy TMDB endpoints.

## Full-movie rights boundary

Discovery metadata never permits full playback. `free`, `verifiedLegal`, media URLs and unreviewed images supplied by discovery are removed by the client adapter.

The original Blender creator registry provides reviewed open films. Wikimedia candidates require a specific CC0/CC BY/CC BY-SA license URL, artist credit, no stated restrictions and canonical media identity. License and file identity are rechecked at playback. Public-domain marks and NC/ND licenses are excluded from automatic admission. Source attribution/license links remain visible.

Internet Archive uploader claims are not sufficient to establish commercial playback rights. Arbitrary uploads are rejected; only IDs linked to the reviewed creator registry can be admitted. Adding an Archive film requires an independent rights-holder review, not changing a client `verifiedLegal` flag. No commercial feature film is automatically streamed because Wikidata or TVmaze lists it.

Metadata eligibility is distinct from successful playback. Media transport/codec checks run when a film is selected; unavailable sources provide Retry/View Legal Source. Poster lazy loading and viewport rendering avoid mounting hundreds of cards or probing every stream at startup.

## Verification and deployment

`npm run test`, `npm run test:e2e`, `npm run build`, `npm run android:usb:test`, `npm run android:sync`, and `node scripts/check-android-device.mjs` cover service, browser and connected-device behavior. `npm run catalog:verify` checks actual upstream data through the running backend; records are ignored under `.cache/catalog/`, separate from fixtures.

Web/native production needs an HTTPS backend serving `/api/open-catalog`, `/api/free-catalog` and `/api/playback`. A static-only host cannot run these server handlers. Configure the existing release API base URL only after selecting that backend; this change does not deploy or alter production settings. Native CORS accepts `https://localhost`; additional production web origins must be explicit server settings. No secret belongs in `VITE_*` or an APK.

USB preview still chooses 5188–5199 and preserves existing reverse mappings. HTTP URL/cleartext remain debug-only; release assets/manifest have separate checks. See [Android USB guide](ANDROID_USB_PREVIEW.md).

Official references: [Wikidata licensing](https://www.wikidata.org/wiki/Wikidata:Licensing), [TVmaze API/licensing](https://www.tvmaze.com/api), [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference).

## Verified on 2026-10-13

- Real backend checks: Wikidata pages 1/2 for both IN/PH (25 films each), TVmaze index, current schedules and search. Sample Wikidata titles include King and Love You So Bad; TVmaze returned Bigg Boss's 2026-10-13 episode. These are actual upstream responses, not demo fixtures.
- Connected SM-T385K Android 9/API 28 WebView 101: catalog service status `live`, 75 open metadata items; CSS HMR and React Refresh passed without full reload or APK rebuild. Real Dune YouTube embed reached `playing`.
- Service tests: 24 passed. USB tests: 7 passed, 1 skipped because another listener already occupied 5188; occupied-port handling was tested on allocated ports without stopping that listener.
- Browser QA: 23/24 passed in the full final run; the desktop 500-title test initially timed out awaiting the page `load` event. Its navigation now waits for DOM content and actual UI assertions; focused rerun passed all 3 performance/trailer-registry tests. The 500-title/25-page fixture mounted 30 desktop cards and 12 mobile cards. Fixture scale is not a claim of 500 licensed full films.
- Actual web streams played: Commons Miñocas, Big Buck Bunny, Sintel and Tears of Steel. Lost Flower sometimes failed its selected-source probe/decoding; the legal source fallback remained usable. Third-party availability is not guaranteed.
- TypeScript/build, Capacitor sync and local debug APK/release APK/AAB builds passed. Packaged release assets/resources and manifests contain no live URL, cleartext development configuration or server token variable.
- No production deployment, Play upload or main merge. Newer Android hardware and deployed HTTPS backend remain unverified.

Final handoff: active USB preview is now **5188**. HMR and the real open catalog were reverified on the same Android 9 device; that refresh returned 73 open-data items. The native app was aligned once after the port change; subsequent CSS/React probe updates did not rebuild the APK. Initial DevTools checks immediately after reinstall timed out, then passed once the WebView completed startup. Release artifact isolation checks passed again.
