# Data Safety / privacy preparation — DRAFT, not a submitted declaration

App: ReelTara. Date: 2026-10-13. No Play Console answers have been submitted. This inventory must be approved by the actual developer/account owner and checked against the deployed backend and SDK behavior.

| Component | Observed behavior | Required owner decision / verification |
|---|---|---|
| Local profile, country, watchlist, trailer history, viewing progress | Persisted locally under `reeltara-user-v1`; no account creation/authentication or cloud sync implemented | Confirm retention/deletion wording; Android backup is currently enabled, so do not promise data never leaves the device |
| Open catalog backend | Requests carry query, country, pagination; upstream sees server IP/User-Agent | Select HTTPS production backend, define request/access-log retention, support contact and processing terms |
| YouTube IFrame API | Third-party script/embed and user-initiated trailer requests; YouTube may process IP, device/browser data, identifiers/cookies under its policies | Disclose third-party processing and review consent/age requirements; do not declare "no data collected" without checking this |
| Wikimedia/Archive/Blender streams | Browser requests media directly to provider; providers receive IP/User-Agent and requested title/file | Explain external services and data handling; confirm media rights separately from successful playback |
| Google Fonts | External font stylesheet/font requests remain in HTML | Include in privacy/network inventory; offline uses existing system fallbacks |
| Ads / analytics / billing | No AdMob, analytics or billing SDK detected in package/native dependencies; entitlement/ad services are placeholders | Current implementation cannot be described as having AdMob. Before adding ads, audit SDK/consent/AD_ID, declare Contains ads accurately, repeat Data Safety and copyright review |
| User account | No actual registration/login/account backend | Do not invent credentials or a deletion endpoint. If accounts are introduced, provide in-app and public web deletion routes |

Before release supply: developer legal/display name, privacy point of contact, public privacy policy URL, support URL, final HTTPS backend and log retention, target audience/content rating/countries, ads business model, release signing/app ownership and maximum versionCode already uploaded. No secrets or signing passwords should be sent in chat or committed.

A published policy must accurately describe collection/use/sharing, security, retention/deletion, developer/contact and third parties; an in-app accessible copy/link is also required. This draft is not a legal approval or final policy. The current app has no privacy policy surface or verified public policy URL.

Sources reviewed: [User Data/privacy/Data Safety](https://support.google.com/googleplay/android-developer/answer/10144311), [account deletion](https://support.google.com/googleplay/android-developer/answer/13327111), [Ads policy](https://support.google.com/googleplay/android-developer/answer/9857753), [app content declarations](https://support.google.com/googleplay/android-developer/answer/9859455).
