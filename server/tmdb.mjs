import { cached } from "./cache.mjs";
// Shared by Vite development middleware and the Vercel server function.
// Credentials only exist in the server process. Never use a VITE_ token.
export async function tmdbResponse(
  input,
  token = process.env.TMDB_READ_ACCESS_TOKEN,
) {
  const params = new URL(input, "http://localhost").searchParams;
  const path = params.get("path") || "";
  const allowed =
    /^(discover\/movie|trending\/movie\/week|movie\/(popular|now_playing|upcoming)|search\/movie|genre\/movie\/list|movie\/\d+(\/watch\/providers)?)$/;
  if (!allowed.test(path))
    return { status: 400, body: { error: "invalid_endpoint" } };
  if (!token) return { status: 503, body: { error: "api_unavailable" } };
  const region = params.get("region") === "PH" ? "PH" : "IN";
  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  url.searchParams.set("language", "en-US");
  url.searchParams.set("region", region);
  url.searchParams.set("watch_region", region);
  url.searchParams.set("page", String(Math.max(1, Math.min(50, Number(params.get("page")) || 1))));
  url.searchParams.set("include_adult", "false");
  if (/^movie\/\d+$/.test(path))
    url.searchParams.set("append_to_response", "credits,videos");
  if (path === "search/movie")
    url.searchParams.set("query", (params.get("query") || "").slice(0, 200));
  try {
    const ttl = path.includes("trending") ? 7200000 : path.includes("now_playing") ? 14400000 : path.includes("upcoming") ? 43200000 : path.includes("genre") ? 604800000 : /^movie\/\d+$/.test(path) ? 86400000 : 21600000;
    return await cached(url.href, ttl, async () => {
    const result = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(6500),
    });
    if (!result.ok) throw new Error("api_unavailable");
    return { status: 200, body: await result.json() };
    });
  } catch {
    return { status: 502, body: { error: "network_unavailable" } };
  }
}
