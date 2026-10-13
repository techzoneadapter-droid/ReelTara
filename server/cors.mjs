// Bundled Capacitor Android uses https://localhost. Additional deployed web
// origins are server configuration, never a wildcard or credentials in the app.
export function handleCors(req, res) {
  const allowed = new Set(['https://localhost', ...(process.env.APP_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)]);
  const origin = req.headers?.origin;
  if (origin && !allowed.has(origin)) { res.status(403).json({ error: 'origin_not_allowed' }); return true; }
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
  }
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  return false;
}
