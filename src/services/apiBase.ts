/** Public HTTPS service base URL (never place tokens or secret keys here). */
export function resolveApiUrl(path: string): string {
  if (!path.startsWith('/api/')) return path;
  const base = (import.meta.env?.VITE_PUBLIC_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (!base) return path; // Vite/Vercel web retains same-origin API behavior.
  if (!/^https:\/\/[^\s/]+(?:\/[^\s]*)?$/.test(base)) {
    throw new Error('VITE_PUBLIC_API_BASE_URL must be HTTPS');
  }
  return base + path;
}
