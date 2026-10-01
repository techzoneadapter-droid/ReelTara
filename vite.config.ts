import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-ignore Shared JavaScript server handler, intentionally outside client sources.
import { tmdbResponse } from "./server/tmdb.mjs";
// @ts-ignore Shared metadata handler.
import { archiveResponse } from "./server/archive.mjs";
// @ts-ignore Shared media headers probe.
import { playbackResponse } from "./server/playback.mjs";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "tmdb-server-proxy",
      configureServer(server) {
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
