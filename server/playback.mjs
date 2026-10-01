import { readFileSync } from "node:fs";
// Exact reviewed URLs only; this endpoint never accepts arbitrary upstream URLs.
const sources = JSON.parse(
  readFileSync(
    new URL("../src/data/freeSources.json", import.meta.url),
    "utf8",
  ),
);
const allowed = new Set(
  Object.values(sources).flatMap((s) => [
    s.playbackUrl,
    ...s.fallbackPlaybackUrls,
  ]),
);
export async function playbackResponse(input, fetcher = fetch) {
  const url = new URL(input, "http://localhost").searchParams.get("url");
  if (!allowed.has(url))
    return { status: 400, body: { ok: false, error: "unreviewed_source" } };
  try {
    // A bounded range request verifies real media responses, including hosts rejecting HEAD.
    const signal = AbortSignal.timeout(6500);
    let current = url;
    let response;
    for (let hop = 0; hop < 5; hop++) {
      const parsed = new URL(current);
      if (
        parsed.protocol !== "https:" ||
        parsed.username ||
        parsed.password ||
        !(
          parsed.hostname === "archive.org" ||
          parsed.hostname.endsWith(".archive.org")
        )
      )
        throw new Error("Untrusted media redirect");
      response = await fetcher(current, {
        headers: { Range: "bytes=0-0" },
        redirect: "manual",
        signal,
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        current = new URL(response.headers.get("location"), current).href;
        continue;
      }
      break;
    }
    const h = response.headers;
    const contentType = h.get("content-type");
    const body = {
      ok:
        [200, 206].includes(response.status) &&
        /^video\//i.test(contentType || ""),
      playbackUrl: url,
      finalUrl: current,
      status: response.status,
      contentType,
      contentLength: h.get("content-length"),
      contentRange: h.get("content-range"),
      acceptRanges: h.get("accept-ranges"),
      cors: h.get("access-control-allow-origin"),
      rangeSupported:
        response.status === 206 || h.get("accept-ranges") === "bytes",
    };
    // Even if Range is ignored, never read or relay a full movie.
    await response.body?.cancel();
    return { status: 200, body };
  } catch (error) {
    return {
      status: 200,
      body: { ok: false, playbackUrl: url, error: error.message },
    };
  }
}
