# ReelTara

React + TypeScript + Vite + Capacitor Android. The existing ReelTara interface, navigation, trailer player, watchlist and viewing progress remain intact.

## Run

```sh
npm install
npm run android:usb
```

Windows USB Preview starts at port 5188, chooses the next available port through 5199, and uses the same port for Vite/HMR, ADB reverse and the debug WebView. It does not stop other projects. React/CSS updates do not rebuild the APK. Device authorization is required once. See [Android USB guide](docs/ANDROID_USB_PREVIEW.md).

For web development: `npm run dev`. For QA: `npm run test`, `npm run test:e2e`, `npm run build`. Browser tests use installed Windows Chrome/Edge in a separate profile, or the bundled Linux browser in CI.

## Free metadata and legal films

Default discovery uses Wikidata CC0 text metadata and the free TVmaze CC BY-SA public API, without a TMDB token or paid API. Country-bound films prioritize India and Philippines. TV schedules include selected-country and global web shows; source attribution is displayed. Unreviewed poster photographs are withheld.

Run `npm run catalog:verify` while the preview backend is running to verify actual upstream responses, pagination, schedules and search. Results are recorded under ignored `.cache/catalog/`, separate from browser fixtures. Details: [open-data catalog, rights policy and deployment](docs/OPEN_DATA_CATALOG.md).

Trending/Popular rank available metadata, not verified current box-office charts. Upcoming uses recorded future dates. Hot Trailers comes from reviewed official YouTube links; open film metadata does not provide trailer or full-film rights.

Original Blender films and explicitly licensed Wikimedia files form the legal playback catalog. CC0/CC BY/CC BY-SA candidates require attribution, clear license metadata, canonical file identity and playback-time revalidation. Arbitrary Internet Archive uploader claims, public-domain marks and NC/ND labels are insufficient for automatic admission. Reviewed creator mirrors remain supported. Unavailable media offers Retry/View Legal Source.

The movie grid mounts viewport rows with overscan, images load lazily, requests deduplicate/cache and visible online sessions refresh periodically. Full streams are checked on selection, not across the entire catalog at startup. User watchlist, country and viewing progress use separate persistent storage.

## Android and production

`npm run android:sync` builds web assets and syncs Capacitor. Debug-only Gradle assets permit loopback HTTP for USB preview. Release denies cleartext and contains no live reload URL. `powershell -File scripts/check-android-apks.ps1` inspects built APK/AAB artifacts.

A release requires an HTTPS backend for `/api/open-catalog`, `/api/free-catalog` and `/api/playback`; static hosting alone cannot execute them. The existing `VITE_PUBLIC_API_BASE_URL` accepts only a public HTTPS URL. Production settings are not deployed or modified by this work. Native backend CORS permits `https://localhost`; web deployment origins must be explicitly configured server-side.

Legacy TMDB adapters remain available for compatibility but are not called by default discovery. If explicitly used later, credentials belong only in ignored local environment/server settings, never `VITE_*`, Git or an APK. No Google Play upload or main-branch merge is part of this setup.
