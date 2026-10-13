# Automatic catalog

The default engine uses free Wikidata and TVmaze metadata; no TMDB token is needed. See [open-data architecture, rights policy and verification](OPEN_DATA_CATALOG.md).

Start `npm run android:usb`, then run `npm run catalog:verify` to check actual India/Philippines API responses and pagination. The output is saved in ignored `.cache/catalog/live-verification.json`.

React/CSS changes update through HMR. Browse results use viewport rendering, stable card handlers and cached requests. Streaming checks run for the selected film, not every catalog item.

Legacy TMDB adapters remain for compatibility and require a server-only token if explicitly integrated again. They are not invoked by default discovery. Never send credentials in chat or add them to `VITE_*`, Git or native assets.
