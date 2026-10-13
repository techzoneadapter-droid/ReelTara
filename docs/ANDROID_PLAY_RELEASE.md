# ReelTara Android / Google Play readiness

Status: **Android packaging scaffold only; NOT yet approved for store release.**

## Architecture
Existing app is React/Vite, not React Native or Expo. Capacitor embeds its built
HTML/CSS/JS as app assets. The API functions under `/api/*` are server-side
Vercel handlers and cannot run inside the Android WebView. Configure a real
HTTPS backend, not credentials in the Android bundle. The backend needs
appropriate CORS rules for the app origin (`https://localhost` on Android)
and should authenticate/rate-limit any abuse-sensitive endpoints.

Set `VITE_PUBLIC_API_BASE_URL=https://YOUR-VERIFIED-BACKEND.example`
before running the build. Never prefix private TMDB credentials with VITE_.
Ensure `/api/tmdb`, `/api/free-catalog`, `/api/archive` and
`/api/playback` resolve correctly, including CORS and any request validation.
Without this, Android can render offline fallback titles but online discovery
and playback checks can fail.

## Build (Windows)
1. Install Node LTS, Android Studio and Android SDK.
2. Run `npm install` to regenerate and commit package-lock.json together with
   the new Capacitor dependencies.
3. Run `npx cap add android` **once** (creates native Android project).
4. Configure the server origin, then `npm run android:sync` and
   `npm run android:open`; Android Studio builds and installs a DEBUG APK.
5. Check final Android package id, release signing, targetSdk required at
   time of release, 16-KB compatibility, media and external URL behavior.
6. Build a signed **release AAB** using Google Play App Signing; do not upload
   debug APK. Test in Play Internal Testing before closed/open/production.

## Must pass before submission
- Confirm commercial rights/licensing for TMDB metadata, promotional trailers,
  cover art and **every** in-app full-length free movie; remove any unverified
  film from production and preserve required attribution.
- Verify official YouTube embeds comply with YouTube player policies and
  remain functional in Android WebView. Never conceal YouTube branding.
- Test India and Philippines internet conditions, locale, search, resume and
  video fullscreen on physical Android 9 and current Android versions.
- Give users meaningful app-native experience; a bare website wrapper is at
  risk under Google Play minimum-functionality policy. Confirm unique in-app
  value and offline/watchlist flows work in the compiled binary.
- Prepare Privacy Policy, support URL, Data Safety, content rating,
  ads disclosure and third-party data rights; do not claim AdMob integration:
  the repository currently has NO Android AdMob SDK.
- Do not promise paid/VIP access: current entitlement/billing code is
  placeholder. If monetizing digital premium content, implement and test
  Google Play Billing first.
- Run `npm run qa` after lockfile regeneration; on this branch, tests and
  Android AAB remain **unverified** until run in local Android SDK environment.

Do not merge to main until build/test/license checklist passes.
