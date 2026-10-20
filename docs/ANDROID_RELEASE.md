# ReelTara Android release procedure

This is a development release pipeline, not proof of Play acceptance.

## Android
- Stable package ID chosen provisionally: vn.com.nvbtech.reeltara. VERIFY before first Play upload (cannot be changed later for this app).
- Capacitor 8 generates the native Android platform in GitHub Actions.
- The build checks Android targetSdkVersion 36, needed for new mobile submissions after August 2026.
- Debug APK is generated without credentials. A signed AAB is generated ONLY when the upload key GitHub Secrets exist.
- Google Play approval and account/test eligibility cannot be granted through GitHub.

## Privacy Policy (website chính thức)
https://nvbtech.com.vn/reeltara/privacy.html — xác nhận trình duyệt công khai có thể mở trước khi khai trên Play Console.

## Backend
Deploy the Vite app and current /api functions on an HTTPS host such as Vercel.
Set GitHub Actions repository variable REELTARA_API_ORIGIN to the HTTPS origin (no path or trailing slash), e.g. https://YOUR_HOST.vercel.app.
The Android build bakes this PUBLIC origin into requests; it is not a credential.
Keep TMDB_READ_ACCESS_TOKEN server-side only, and do not enable commercial use without proper licensing.
Without a backend origin, the APK can show bundled fallback data but online playback and discovery endpoints will fail.

## Production signing
Generate and privately back up your Play upload key:

    keytool -genkeypair -v -keystore reeltara-upload.jks -alias reeltara-upload -keyalg RSA -keysize 4096 -validity 10000

Base64 encode the keystore locally. NEVER commit or share the keystore or password.
Configure GitHub Actions Secrets:
- ANDROID_KEYSTORE_BASE64: base64 of your upload keystore
- ANDROID_KEYSTORE_PASSWORD: keystore password
- ANDROID_KEY_ALIAS: alias (e.g. reeltara-upload)
- ANDROID_KEY_PASSWORD: private key password

Re-run Android QA and bundles in the GitHub Actions tab. Download the signed AAB artifact only if the signing stage ran successfully. GitHub run number is used as app versionCode.

## Before any publication
- [ ] Confirm Play Console organization and package ID.
- [ ] Confirm the public HTTPS API origin and LIVE film playback on actual Android devices.
- [ ] Confirm source and artwork/trailer rights individually; uploader metadata alone is insufficient evidence.
- [ ] Confirm TMDB commercial data rights if any business or monetization use is planned.
- [ ] Replace generated default Android icon and splash with approved ReelTara assets.
- [ ] Publish and review the privacy policy, add verified email contact, complete Play Data Safety.
- [ ] Complete content rating, target audience, app access, ads declaration and store listings.
- [ ] Execute physical device tests (portrait, landscape, Back navigation, buffering, offline, resume, external links).
- [ ] Meet the testing rules applicable to your Play developer account.
- [ ] Upload signed AAB and resolve all Play pre-launch report warnings.

## Local Windows instructions
Install Node.js 22, Android Studio / SDK API 36, and run:

    npm ci
    npm install --no-save --package-lock=false @capacitor/core@8.0.0 @capacitor/android@8.0.0 @capacitor/cli@8.0.0
    npm run build
    npx cap add android
    npx cap sync android
    npx cap open android

Only run npx cap add android once per generated native directory. For lasting native customizations, commit the Android project in a separate change.

## Branded app icon
CI generates Android launcher icons and splash resources from `public/brand/icon.png` with `scripts/generate_android_assets.py` and Capacitor Assets. Because the current source icon is small, review the resulting icons on real devices and supply a higher-resolution original before final publication if edges appear soft.
