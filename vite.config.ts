import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-ignore Shared JavaScript server handler, intentionally outside client sources.
import { tmdbResponse } from "./server/tmdb.mjs";
// @ts-ignore Shared metadata handler.
import { archiveResponse } from "./server/archive.mjs";
// @ts-ignore Shared media headers probe.
import { playbackResponse } from "./server/playback.mjs";
// @ts-ignore Shared legal catalog handler.
import { freeCatalogResponse } from "./server/freeCatalog.mjs";
// @ts-ignore Server-side open-data metadata handler.
import { openCatalogResponse } from "./server/openCatalog.mjs";
// @ts-ignore Node-only environment loader.
import { serverToken } from "./server/environment.mjs";
// @ts-ignore Shared Node middleware with production-compatible CORS/method handling.
import { getMiddleware } from "./server/devApi.mjs";
// @ts-ignore Public health contract.
import healthHandler from "./api/health.mjs";
export default defineConfig({
  server: {
    // Native builds/downloads are not HMR inputs and can lock files on Windows.
    watch: { ignored: ['**/.cache/**', '**/android/**', '**/dist/**'] },
  },
  plugins: [
    react(),
    {
      name: "tmdb-server-proxy",
      configureServer(server) {
        server.middlewares.use('/api/health', healthHandler);
        server.middlewares.use('/api/open-catalog',getMiddleware((req:{url?:string})=>openCatalogResponse(req.url||'/'),'public, s-maxage=900, stale-while-revalidate=3600'));
        server.middlewares.use('/api/free-catalog',getMiddleware(()=>freeCatalogResponse(),'public, s-maxage=900, stale-while-revalidate=900'));
        server.middlewares.use('/api/playback',getMiddleware((req:{url?:string})=>playbackResponse(req.url||'/')));
        server.middlewares.use('/api/archive',getMiddleware((req:{url?:string})=>archiveResponse(req.url||'/'),'public, s-maxage=3600'));
        server.middlewares.use('/api/tmdb',getMiddleware((req:{url?:string})=>tmdbResponse(req.url||'/',serverToken(server.config.mode))));
      },
    },
  ],
});
