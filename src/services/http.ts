import { resolveApiUrl } from "./apiBase";
export type ErrorCode =
  | "network_timeout"
  | "offline"
  | "network_unavailable"
  | "movie_not_found"
  | "api_unavailable"
  | "invalid_response"
  | "trailer_unavailable"
  | "legal_stream_unavailable"
  | "playback_failed";
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}
const cache = new Map<string, { expires: number; data: unknown }>();
const pending = new Map<string, Promise<unknown>>();
export function clearCache() {
  cache.clear();
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('reeltara-cache:')) localStorage.removeItem(key);
    }
  } catch { /* Storage optional. */ }
}
export async function request<T>(
  url: string,
  validate: (value: unknown) => T,
  ttl = 300_000,
): Promise<T> {
  if (!cache.has(url)) {
    try { const saved = JSON.parse(localStorage.getItem(`reeltara-cache:${url}`) || 'null'); if (saved && typeof saved.expires === 'number' && saved.expires > Date.now() - Math.min(ttl, 86400000)) cache.set(url, saved); } catch { /* Storage optional. */ }
  }
  const hit = cache.get(url);
  if (hit && hit.expires > Date.now()) {
    try { return validate(hit.data); } catch { cache.delete(url); }
  }
  let task = pending.get(url);
  if (!task) {
    task = (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), url.startsWith("/api/free-catalog") ? 60000 : url.startsWith("/api/open-catalog") ? 45000 : 8000);
        try {
          const response = await fetch(resolveApiUrl(url), {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          });
          if (!response.ok) {
            let message = `Service unavailable (${response.status})`;
            try {
              const body = await response.json();
              if (body.error === 'tmdb_token_missing') message = 'Live catalog needs a server-side TMDB token.';
              if (body.error === 'tmdb_token_invalid') message = 'The server TMDB token was rejected. Update its configuration.';
              if (body.error === 'tmdb_rate_limited') message = 'Live catalog rate limit reached. Please retry later.';
            } catch { /* Never expose arbitrary upstream errors. */ }
            throw new AppError(
              response.status === 404 ? "movie_not_found" : "api_unavailable",
              message,
              response.status,
            );
          }
          const raw: unknown = await response.json();
          validate(raw);
          const entry = { expires: Date.now() + ttl, data: raw };
          cache.set(url, entry);
          try { localStorage.setItem(`reeltara-cache:${url}`, JSON.stringify(entry)); } catch { /* Quota or private browsing. */ }
          try {
            const keys = Object.keys(localStorage).filter(key => key.startsWith('reeltara-cache:'));
            if (keys.length > 120) for (const key of keys.slice(0, keys.length - 120)) localStorage.removeItem(key);
          } catch { /* Storage optional. */ }
          if (cache.size > 150) cache.delete(cache.keys().next().value!);
          return raw;
        } catch (error) {
          if (
            attempt === 1 ||
            (error instanceof AppError &&
              (error.code === "invalid_response" ||
                (error.status && error.status < 500)))
          ) {
            throw error instanceof AppError
              ? error
              : new AppError(
                  controller.signal.aborted
                    ? "network_timeout"
                    : typeof navigator !== "undefined" && !navigator.onLine
                      ? "offline"
                      : "network_unavailable",
                  controller.signal.aborted
                    ? "Request timed out. Please retry."
                    : "Connection unavailable. Please retry.",
                );
          }
        } finally {
          clearTimeout(timer);
        }
      }
      throw new AppError("network_unavailable", "Connection unavailable.");
    })();
    pending.set(url, task);
    task.finally(() => pending.delete(url)).catch(() => {});
  }
  return validate(await task);
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new AppError("invalid_response", "Invalid service response.");
  return value as Record<string, unknown>;
}
export const array = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
export const str = (value: unknown): string =>
  typeof value === "string" ? value : "";
export const num = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;
