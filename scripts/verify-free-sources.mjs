// Read-only audit: Archive metadata + a bounded media range request, never a full download.
import { readFileSync } from "node:fs";
import { playbackResponse } from "../server/playback.mjs";
const sources = JSON.parse(
  readFileSync(
    new URL("../src/data/freeSources.json", import.meta.url),
    "utf8",
  ),
);
for (const [movie, source] of Object.entries(sources)) {
  for (const playbackUrl of [
    source.playbackUrl,
    ...source.fallbackPlaybackUrls,
  ]) {
    const [, , identifier, ...parts] = new URL(playbackUrl).pathname.split("/");
    const filename = decodeURIComponent(parts.join("/"));
    const response = await fetch(`https://archive.org/metadata/${identifier}`, {
      signal: AbortSignal.timeout(10_000),
    });
    const metadata = await response.json();
    const file = metadata.files?.find((file) => file.name === filename);
    const legal = /creativecommons.org\/licenses\/by\/3.0/.test(
      metadata.metadata?.licenseurl || "",
    );
    const mp4 =
      file &&
      /\.mp4$/i.test(file.name) &&
      /h\.?264|mpeg.?4|mp4/i.test(file.format) &&
      !/sample|preview|thumb|trailer/i.test(file.name);
    const probe = await playbackResponse(
      `/?url=${encodeURIComponent(playbackUrl)}`,
    );
    console.log(
      JSON.stringify({
        movie,
        sourcePageUrl: source.sourcePageUrl,
        legal,
        file: file && { name: file.name, format: file.format, size: file.size },
        ...probe.body,
      }),
    );
    if (!legal || !mp4 || !probe.body.ok) process.exitCode = 1;
  }
}
