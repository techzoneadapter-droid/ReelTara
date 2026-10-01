// Shared by Vite development middleware and the Vercel server function.
// Credentials only exist in the server process. Never use a VITE_ token.
export async function tmdbResponse(
  input,
  token = process.env.TMDB_READ_ACCESS_TOKEN,
) {
  const params = new URL(input, "http://localhost").searchParams;
  const path = params.get("path") || "";
  const allowed =
    /^(trending\/movie\/week|movie\/(popular|now_playing|upcoming)|search\/movie|genre\/movie\/list|movie\/\d+(\/watch\/providers)?)$/;
  if (!allowed.test(path))
    return { status: 400, body: { error: "invalid_endpoint" } };
  if (!token) return { status: 503, body: { error: "api_unavailable" } };
  const region = params.get("region") === "PH" ? "PH" : "IN";
  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  url.searchParams.set("language", "en-US");
  url.searchParams.set("region", region);
  url.searchParams.set("include_adult", "false");
  if (/^movie\/\d+$/.test(path))
    url.searchParams.set("append_to_response", "credits,videos");
  if (path === "search/movie")
    url.searchParams.set("query", (params.get("query") || "").slice(0, 200));
  try {
    const result = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(6500),
    });
    if (!result.ok)
      return {
        status: result.status === 404 ? 404 : 502,
        body: { error: "api_unavailable" },
      };
    return { status: 200, body: await result.json() };
  } catch {
    return { status: 502, body: { error: "network_unavailable" } };
  }
}
