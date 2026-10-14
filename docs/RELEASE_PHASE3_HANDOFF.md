# ReelTara Phase 3 — release safety handoff (DRAFT)

**Not cleared for Play publication.** USB debug success and local unit tests do not constitute
production HTTPS or rights clearance. No production deployment, signing or ads were enabled.

## Release preflight

Use `npm run play:preflight` locally. It intentionally exits nonzero until the owner
has supplied and approved the following (environment variables are only approval
inputs, **not** claims that an external audit has occurred):

- `VITE_PUBLIC_API_BASE_URL`: real HTTPS URL of deployed API backend serving
  `/api/open-catalog`, `/api/free-catalog` and other required endpoints.
- `PLAY_PRIVACY_POLICY_URL`: actual published privacy policy, linked in app.
- `PLAY_SUPPORT_URL`: actual published contact/support information.
- `PLAY_RIGHTS_APPROVED=true`: documented title-by-title and artwork/media commercial
  rights, attribution, distribution territories and ads use; owner reviewed.
- `PLAY_DATA_SAFETY_APPROVED=true`: privacy/Data Safety questions reviewed against
  production backend logs, player embeds, fonts, backup, network calls and SDKs.
- `PLAY_APPLICATION_ID_APPROVED=true`: confirm permanent Android package ID.
- `PLAY_SIGNING_VERIFIED=true`: production upload key and Play App Signing validated
  off Git. Never commit keystores, passwords or service credentials.

These flags alone **do not technically verify** remote services or contracts: collect
actual evidence in an owner-controlled release dossier and verify in Play internal testing.
Keep this checklist separate from Android debug settings and from production secrets.

## Backend smoke test before AAB release
1. Deploy the API as an HTTPS service owned by the developer.
2. Test /api/open-catalog for IN and PH, and verified /api/free-catalog.
3. Test the preflight with actual host URL and approved policy values.
4. Ensure an installed **release** APK/AAB can fetch data; bundled Capacitor
   assets do not contain server-side handlers. Test offline fallback separately.
5. Verify CORS Origin https://localhost for Capacitor; avoid permissive wildcard
   where authentication is introduced.
6. Test performance and player links on actual Android 9 and a current Android device.

## Copyright and attribution blockers
Wikidata text CC0 does not imply image rights. TVmaze attribution/ShareAlike needs
commercial release review and image rights vary. Internet Archive hosting does not
by itself grant broad re-streaming/ad rights; verify every title, uploader, music and
territory. YouTube embedding does not grant commercial redistribution. Remove
unverified assets from store-facing screens.

## No account creation
The current locally saved watchlist is not a user account. If future signup
or hosted account data is added, implement Google Play account deletion requirements.

See DATA_SAFETY_DRAFT.md, RELEASE_READINESS_PHASE2.md and RELEASE_READINESS_PHASE3.md.

The Phase 3 technical changes add npm run play as a safe preflight alias, backend:smoke for live API checks, strict shared development/production CORS contracts, a non-secret health endpoint and Vercel bundling preparation. See BACKEND_PRODUCTION_SETUP.md. Local smoke does not clear public HTTPS or signing blockers.

Thumbnail repair now supplies an error-aware source/poster/backdrop/reviewed-video/local-SVG chain across lists, hero and details. Unreviewed open-data artwork remains withheld. Web QA passed; new Android thumbnail QA requires an authorized connected device and remains blocked until measured.
