import { tmdbResponse } from "../server/tmdb.mjs";
import { handleCors } from '../server/cors.mjs';
export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== "GET")
    return res.status(405).json({ error: "method_not_allowed" });
  const result = await tmdbResponse(req.url);
  res.setHeader(
    "Cache-Control",
    result.status === 200
      ? "public, s-maxage=300, stale-while-revalidate=600"
      : "no-store",
  );
  res.status(result.status).json(result.body);
}
