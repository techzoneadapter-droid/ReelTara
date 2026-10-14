# Backend setup awaiting deployment approval

No production infrastructure has been deployed or modified by this work.

The repository now contains vercel.json for the Vite frontend and api/*.mjs Node handlers. Select Node 24.x (matches local QA) when reviewing the hosting project. Keep src/data/freeSources.json bundled; handlers import server modules rather than shipping server secrets in the client.

Vercel Hobby is suitable for a personal noncommercial demo within its quotas. It is not a zero-cost entitlement for an ad-supported commercial release: [Hobby terms](https://vercel.com/docs/plans/hobby). Confirm a permitted hosting plan or existing infrastructure before production deployment. [Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

After the owner approves deployment and supplies the actual host:

1. Configure server APP_ALLOWED_ORIGINS as an explicit comma-separated list of actual web frontend origins. https://localhost is already allowed for Capacitor. Do not use wildcard origins.
2. Build the release frontend with VITE_PUBLIC_API_BASE_URL set to the actual public HTTPS backend origin. It is a public URL, not a secret. Do not put tokens in VITE_ variables or URL query strings.
3. No TMDB token is required for Wikidata, TVmaze and reviewed free catalog. Optional legacy TMDB_READ_ACCESS_TOKEN belongs only in server secrets, never APK/frontend.
4. Run npm run backend:smoke -- followed by the actual HTTPS origin. It checks health, real IN/PH metadata, free catalog, rejected unreviewed playback, native OPTIONS, blocked unknown origins and unsupported methods. Failure exits nonzero. Local-only smoke uses npm run backend:smoke -- --local and does not verify production HTTPS.
5. Confirm cached GET responses have Vary: Origin and correct native CORS; errors, health, OPTIONS and playback verification are no-store. Cold serverless caches may query providers again; monitor quotas/timeouts and provider outages rather than assuming persistent memory.
6. Rebuild using npm run android:verify and inspect with powershell -File scripts/check-android-apks.ps1. Release must contain no HTTP dev URL, cleartext allowance, debug network XML or mixed-content allowance.
7. Install a release APK via the approved testing workflow; test public backend data, detail/trailer/free source, failed images, offline recovery and rejected playback on Android 9 and a current Android device. USB/Vite success is insufficient for this check.

Use npm run play to inspect remaining owner approvals. Do not set approval flags until the corresponding evidence has actually been reviewed. Release signing credentials and rights documents are held off Git.
