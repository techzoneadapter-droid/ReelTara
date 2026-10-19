/** Resolve read-only /api endpoints for a bundled native app.
 * The host URL is public. TMDB secrets must remain exclusively server-side.
 */
const API_ORIGIN = ((import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string }}).env?.VITE_API_BASE_URL || "").trim();
export function resolveApiUrl(path: string, base = API_ORIGIN): string {
  if (!path.startsWith("/api/") || !base) return path;
  try {
    const target = new URL(base);
    if (target.protocol !== "https:" || target.username || target.password ||
        target.pathname !== "/" || target.search || target.hash) return path;
    return target.origin + path;
  } catch { return path; }
}
