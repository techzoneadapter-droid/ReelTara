import { playbackResponse } from "../server/playback.mjs";
export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "method_not_allowed" });
  const result = await playbackResponse(req.url);
  res.setHeader("Cache-Control", "no-store");
  return res.status(result.status).json(result.body);
}
