// Read-only cross-origin API access for bundled Capacitor Android WebViews.
const mobileOrigins = new Set(["http://localhost", "https://localhost"]);
export function enableMobileCors(req, res) {
  const origin = req.headers?.origin;
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");
  if (mobileOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Accept, Content-Type");
  }
  if (req.method === "OPTIONS") { res.status(204).end(); return true; }
  return false;
}
