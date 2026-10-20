import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-ignore Shared JavaScript server handler, intentionally outside client sources.
import { tmdbResponse } from "./server/tmdb.mjs";
// @ts-ignore Shared metadata handler.
import { archiveResponse } from "./server/archive.mjs";
// @ts-ignore Shared media headers probe.
import { playbackResponse } from "./server/playback.mjs";
// @ts-ignore Shared legal catalog handler.
import { freeCatalogResponse } from "./server/freeCatalog.mjs";
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'exclude-unreviewed-bundled-artwork',
      apply: 'build',
      closeBundle() {
        for (const name of ['dune', 'hero', 'oppenheimer', 'poor-things', 'interstellar', 'spiderverse', 'past-lives']) {
          rmSync(resolve('dist/images', name + '.jpg'), { force: true });
        }
      },
    },
    {
      name: "tmdb-server-proxy",
      configureServer(server) {
        server.middlewares.use("/api/free-catalog", async (_req, res) => { const result = await freeCatalogResponse(); res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(result.body)); });
        server.middlewares.use("/api/playback", async (req, res) => {
          const result = await playbackResponse(req.url);
          res.statusCode = result.status;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.end(JSON.stringify(result.body));
        });
        server.middlewares.use("/api/archive", async (req, res) => {
          const result = await archiveResponse(req.url);
          res.statusCode = result.status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result.body));
        });
        server.middlewares.use("/api/tmdb", async (req, res) => {
          const result = await tmdbResponse(req.url);
          res.statusCode = result.status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result.body));
        });
      },
    },
  ],
});
