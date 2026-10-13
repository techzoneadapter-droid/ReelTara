import { cached } from "./cache.mjs";
import { createHash } from 'node:crypto';
// Shared by Vite development middleware and the Vercel server function.
// Credentials only exist in the server process. Never use a VITE_ token.
export async function tmdbResponse(
  input,
  token = process.env.TMDB_READ_ACCESS_TOKEN,
) {
  const params = new URL(input, "http://localhost").searchParams;
  const path = params.get("path") || "";
  const allowed =
    /^(discover\/movie|trending\/movie\/week|movie\/(popular|now_playing|upcoming)|search\/movie|genre\/movie\/list|movie\/\d+(\/watch\/providers|\/videos)?)$/;
  if (!allowed.test(path))
    return { status: 400, body: { error: "invalid_endpoint" } };
  if (!token?.trim()) return { status: 503, body: { error: "tmdb_token_missing" } };
  const region = params.get("region") === "PH" ? "PH" : "IN";
  const url = new URL(`https://api.themoviedb.org/3/${path === 'movie/popular' ? 'discover/movie' : path}`);
  url.searchParams.set("language", "en-US");
  url.searchParams.set("region", region);
  url.searchParams.set("watch_region", region);
  url.searchParams.set("page", String(Math.max(1, Math.min(50, Math.floor(Number(params.get("page")) || 1)))));
  url.searchParams.set("include_adult", "false");
  if (url.pathname.endsWith('/discover/movie')) {
    const sort = params.get('sort');
    url.searchParams.set('sort_by', sort === 'rating' ? 'vote_average.desc' : sort === 'year' ? 'primary_release_date.desc' : 'popularity.desc');
    url.searchParams.set('include_video', 'false');
    url.searchParams.set('with_release_type', '2|3|4|5|6');
    url.searchParams.set('release_date.lte', new Date().toISOString().slice(0, 10));
    if (sort === 'rating') url.searchParams.set('vote_count.gte', '300');
  }
  if (/^movie\/\d+$/.test(path))
    url.searchParams.set("append_to_response", "credits,videos");
  if (path === "search/movie")
    url.searchParams.set("query", (params.get("query") || "").slice(0, 200));
  try {
    const ttl = path === 'search/movie' ? 300000 : path.includes('trending') ? 900000 : path.includes('now_playing') ? 1800000 : path.includes('genre') ? 604800000 : /^movie\/\d+$/.test(path) ? 86400000 : path.endsWith('/videos') ? 1800000 : 3600000;
    const scope = createHash('sha256').update(token).digest('hex');
    return await cached(`${scope}:${url.href}`, ttl, async () => {
    const result = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(6500),
    });
    if (!result.ok) {
      const error = new Error('tmdb_upstream_failed');
      error.status = result.status;
      throw error;
    }
    const body = await result.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid_response');
    return { status: 200, body };
    }, { staleMs: ttl });
  } catch (error) {
    return { status: error.status === 401 || error.status === 403 ? 503 : error.status === 429 ? 429 : 502,
      body: { error: error.status === 401 || error.status === 403 ? 'tmdb_token_invalid' : error.status === 429 ? 'tmdb_rate_limited' : 'network_unavailable' } };
  }
}
