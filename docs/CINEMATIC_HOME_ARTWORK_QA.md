# Cinematic Home and licensed artwork QA

2026-10-14 · release/android-play-readiness · synchronized safely from 18ad17e.

## Cause and resulting behavior

The original open backend always set poster/backdrop to empty, and the frontend independently erased every discovery image. This protected image rights but offered no way to admit a properly licensed image. Hero initially selected posterless discovery records; 18ad17e preferred illustrated free films using film-source verification, which still did not establish each artwork's license. CSS backgrounds also lacked the image error chain.

The new pipeline resolves the exact Commons P18 file associated with a Wikidata film; TVmaze can use an exact IMDb-to-Wikidata link. It reads per-file license/artist metadata, rejects restrictions, unsafe URLs and NC/ND licenses, caches bounded evidence, and preserves only validated artwork in the frontend. Missing art never removes a film or grants playback rights. No poster is scraped from TMDB, Google Images or a film website.

Home selects up to five illustrated editorial features with validated image evidence, displays a dark gradient, readable title/metadata/source credit and Explore Movie action. Watch Trailer is disabled when no reviewed trailer exists; a film frame is not falsely called an official trailer. Controls change the active banner without autoplaying video. Only the active large image mounts; cards remain lazy with small source thumbnails. Low-memory Android and reduced-motion settings disable the short opacity transition.

Featured Today is an editorial collection. New Releases, India, Philippines, series, legal free films and official trailers remain separate. Upcoming is additional source-date metadata. There is no invented Trending/Top Box Office chart. New Releases originally could select future films before filtering at the client; the date condition now runs in SPARQL before pagination, with new cache keys.

Free imagery loads independently of slower discovery queries. Image decode state belongs to the memoized image component, not App. Existing viewport virtualization is retained. External font CSS no longer blocks the first screen; a controlled eight-second font delay is covered by a browser test. Existing saved state is preserved.

## Real image evidence — not placeholder success

The live free catalog contained 26 films: **23 Commons films with per-file image license evidence**, plus three existing Blender/local-art entries. All 23 licensed thumbnail URLs returned HTTP 200 image/jpeg; all 23 decoded in the actual Web UI and Samsung SM-T385K Android 9 WebView. Existing local images are separately counted and are not added to the verified-image count.

On Samsung the first hero frame decoded at 960×540, the next at 500×281 (provider-issued responsive fallback), the selected Commons detail at 960×640, and four reviewed YouTube thumbnails at 480×360. Screenshot evidence includes home, free list, detail and trailers. These are real requests in the running app, with no fixture interception.

The sampled new-release IN API returned 25 films, including Drishyam: The Conclusion (2026-10-02), Kumbhini (2026-09-14) and Panchanama (2026-09-11), and no future dates. Those three sampled records had no verified artwork. They remain with default artwork; this work does **not** claim that every commercial Indian/Philippine film now has a licensed poster.

The UI's per-catalog counts distinguish licensed image sources, existing local images and default artwork. They are not presented as network-decode counts; a failed source still falls through to the branded placeholder. Actual decoded counts above are separately observed. File licensing is machine-readable source evidence, not a fabricated owner approval for advertising, territories, music, performers or trademarks.

## Verification

| Check | Result |
|---|---|
| Unit / API contract tests | PASS: 34 |
| Complete browser suite / TypeScript / web build | PASS: 31 browser cases; tsc -b and Vite production build |
| Live licensed image HTTP responses | PASS: 23 of 23 |
| Real Web UI image decode | PASS: 23, no collected page errors |
| Real Samsung UI image decode | PASS: 23; Home, switch, list, detail, YouTube thumbnails |
| 500-item bounded DOM fixtures | PASS: 30 mounted desktop / 12 mobile at the final sampled position |
| Backend real recent dates | PASS: 25 IN entries, no future dates in sampled response |
| Native sync and final debug/release APK + AAB | PASS: full native/unit build, then final asset sync and successful incremental packaging |
| Packaged release networking | PASS: APK/AAB inspection excludes debug live URL, cleartext and debug network resources |
| USB HMR follow-up | PASS: CSS and React updates on Samsung, unchanged timeOrigin/APK timestamp/native fingerprint, no collected runtime errors |
| USB scripts | PASS: 8 cases, 1 explicit port-occupied skip; no listener terminated |
| Local live backend smoke | PASS: 8 checks including IN/PH 25 each and free catalog 26 |
| Publication / ads clearance | BLOCKED: existing Phase 3 owner/backend/signing/privacy/rights requirements remain |
| New Android device / fleet FPS and RAM | BLOCKED: only Android 9 Samsung measured in this follow-up; no new FPS/RAM assertion |

Final production web output is 285.94 kB JS / 89.29 kB gzip. The native full build executed 218 tasks; final incremental packaging after the last web changes succeeded with 66 executed / 143 up-to-date tasks. npm run play still intentionally exits 1 with 2 PASS / 7 BLOCKED. No approval flags were set, and no Google Play publication or main merge is performed.

At 08:21:02Z the actual Samsung Home declared 132 distinct loaded catalog records: 24 licensed image sources, 3 existing local images and 105 default artworks. The extra licensed open-data entry is TVmaze Amanpour, linked by its exact IMDb entity to a Commons photograph (CC BY 2.0); it is an illustrative source photo, not an official poster or permission to play the television program. This source-availability count is distinct from the 23 free-film images whose decode was measured on both platforms.

At 08:32:59Z the physical-device HMR probe confirmed CSS/React refresh with no full reload, no APK rebuild and no runtime exceptions. Its temporary source probes were restored. Evidence: .cache/android-usb/device-verification.json.

A separate real Web UI check selected Amanpour through search, decoded the associated Commons photograph at 960×640 in details, and confirmed that Watch Free was absent. Saved evidence: .cache/phase4/open-image-ui.json and open-image-web.png. Thus the discovery artwork path works independently of the free-film registry; image permission does not enable television playback.

## Reproduction and artifacts

Use npm run android:usb (5188 or the existing safe 5188–5199 fallback), npm run qa, node scripts/verify-artwork.mjs and node scripts/check-cinematic-device.mjs. Device QA refreshes this app's API cache and reloads its debug WebView; it does not clear watchlists, edit source or stop other apps. A temporary ADB DevTools forward is allocated and removed for this app only.

Local ignored .cache/phase4 contains licensed-artwork.json, web-artwork.json, android-artwork.json, home-desktop.png, home-mobile.png, home-android.png, free/detail/trailer screenshots. They are development QA evidence, not release/store screenshots or signed-release startup benchmarks.

Main changed files: server/artwork.mjs, server/catalogFetch.mjs, server/openCatalog.mjs, server/freeCatalog.mjs, src/adapters/openCatalog.ts, src/utils/artwork.ts, src/utils/thumbnails.ts, src/services/catalog.ts, src/services/freeCatalog.ts, src/hooks/useCatalog.ts, src/components/ui.tsx, src/App.tsx, src/styles.css and index.html. Tests cover rejected licenses, exact linked image admission, retained metadata, recent-date bounds, one active backdrop, source failure, cached reload, slow fonts and existing movie/player/offline flows.

## Per-file source evidence

The first 23 entries decoded in both platforms; the additional discovery photograph decoded in the separate Web details check. License labels describe source-file evidence, not owner approval for a commercial app.

| Title | Credit | License | File source |
|---|---|---|---|
| Kara Fern - Interview, The | Kara Fern (ZimtHaus) | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:Kara_Fern_-_Interview,_The.webm>) |
| Paula Vázquez et al. - Miñocas | Paula Vázquez et al. | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:Paula_V%C3%A1zquez_et_al._-_Mi%C3%B1ocas.webm>) |
| The Day I Helped Save The World | Gary Mirabelle | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:The_Day_I_Helped_Save_The_World.webm>) |
| Adisra Promthep - Lost Flower (2012) | Adisra Promthep (Peach) | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:Adisra_Promthep_-_Lost_Flower_(2012).webm>) |
| Fox Dark - Cat (2017) | Fox Dark | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:Fox_Dark_-_Cat_(2017).webm>) |
| Philip Piaget - Urraca (2011) | Philip Piaget | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:Philip_Piaget_-_Urraca_(2011).webm>) |
| Ivonne Castillo and Javier Hernández - Obsolete (2023) | Ivonne Castillo and Javier Hernández (Virtual Isopad Productions); edited by Jayvee Enaguas (The Harvett Vault) | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:Ivonne_Castillo_and_Javier_Hern%C3%A1ndez_-_Obsolete_(2023).webm>) |
| Eni Talić - ACAB (2019) | Eni Talić (YT: 1, 2) | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:Eni_Tali%C4%87_-_ACAB_(2019).webm>) |
| Emma Rose Marshall - Notre Jeu - Cave Flower, The (2024) | Emma Rose Marshall and Leroux van Diemen (Spunkyrose Studio) | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:Emma_Rose_Marshall_-_Notre_Jeu_-_Cave_Flower,_The_(2024).webm>) |
| Natasha Nayo - Beyond the Walls (2015) | Natasha Nayo (Starcre8tor) (VM, YT) | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:Natasha_Nayo_-_Beyond_the_Walls_(2015).webm>) |
| Kagan Marks - Jen and Gen (2014) | Kagan Marks | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:Kagan_Marks_-_Jen_and_Gen_(2014).webm>) |
| David Romero - Nightmare, The (2013) | Kevin MacLeod | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:David_Romero_-_Nightmare,_The_(2013).webm>) |
| Aline Dykmans - Sheep Possible (2015) | Aline Dykmans | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:Aline_Dykmans_-_Sheep_Possible_(2015).webm>) |
| Destiny Zukevich et al. - Jeremy (2024) | Destiny Zukevich (destinykawaii) et al. | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:Destiny_Zukevich_et_al._-_Jeremy_(2024).webm>) |
| Katherine Chi - Telescope (2015) | Katherine Chi | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:Katherine_Chi_-_Telescope_(2015).webm>) |
| Matthew Yang - You Imagined (2013) | Matthew Yang | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:Matthew_Yang_-_You_Imagined_(2013).webm>) |
| Rensaven - Seaside (2024) | Rensaven | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:Rensaven_-_Seaside_(2024).webm>) |
| RavenRugosa - Understories (2025) | ravenRugosa (theCorvidHive) | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:RavenRugosa_-_Understories_(2025).ogv>) |
| The Animated Sign | Simonsegni (Stefano Simonetti) | [CC BY-SA 4.0](<https://creativecommons.org/licenses/by-sa/4.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:The_Animated_Sign.webm>) |
| Il segno animato | Simonsegni (Stefano Simonetti) | [CC BY-SA 4.0](<https://creativecommons.org/licenses/by-sa/4.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:Il_segno_animato.webm>) |
| (OO) - Animation Short Film (2017) | Osro | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:(OO)_-_Animation_Short_Film_(2017).webm>) |
| Afternoon Class - Animation Short Film (2014) | Osro | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:Afternoon_Class_-_Animation_Short_Film_(2014).webm>) |
| Award Winning Animated Short Film - Koji | Zean | [CC BY 3.0](<https://creativecommons.org/licenses/by/3.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:Award_Winning_Animated_Short_Film_-_Koji.webm>) |
| Amanpour (illustrative photograph) | Palácio do Planalto from Brasilia, Brasil | [CC BY 2.0](<https://creativecommons.org/licenses/by/2.0>) | [Original file](<https://commons.wikimedia.org/wiki/File:10.02.2023_-_Entrevista_%C3%A0_CNN_Internacional,_em_Washington_(EUA)_(52681050048).jpg>) |
