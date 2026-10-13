# ReelTara open-data catalog (zero paid API credentials)
- Wikidata film metadata: CC0; only text metadata is imported; images are deliberately excluded pending asset-specific licensing.
- TVmaze series listings: CC BY-SA, source link + attribution retained. **Check ShareAlike obligations before commercial publication.**
- Open full-length films remain behind the independently reviewed verifiedLegal catalogue. Discovery records never enable direct playback.
- Open data does not provide reliable real-time box-office rankings or official trailers. UI must not promise such results.
- Live TVmaze/Wikidata endpoints may rate-limit or fail. Server-side bounded cache and partial results preserve operation.
- Server endpoint: /api/open-catalog?country=IN&page=1 (PH supported).
- Native Android release must point to a deployed HTTPS API backend; USB Vite dev runs middleware locally.
- No paid TMDB license or token required for the new discovery path. Legacy TMDB adapter remains in source for rollback but is no longer invoked by catalog navigation.
- This commit has not been tested on a physical device; verify package build, poster scroll, provider links and API availability before merging or store submission.
