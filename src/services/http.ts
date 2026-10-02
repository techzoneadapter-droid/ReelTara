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
}
export async function request<T>(
  url: string,
  validate: (value: unknown) => T,
  ttl = 300_000,
): Promise<T> {
  if (!cache.has(url)) {
    try { const saved = JSON.parse(localStorage.getItem(`reeltara-cache:${url}`) || 'null'); if (saved && saved.expires > Date.now() - 604800000) cache.set(url, saved); } catch { /* Storage optional. */ }
  }
  const hit = cache.get(url);
  if (hit && hit.expires > Date.now()) return validate(hit.data);
  let task = pending.get(url);
  if (!task) {
    task = (async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), url.startsWith("/api/free-catalog") ? 60000 : 8000);
        try {
          const response = await fetch(url, {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          });
          if (!response.ok)
            throw new AppError(
              response.status === 404 ? "movie_not_found" : "api_unavailable",
              `Service unavailable (${response.status})`,
              response.status,
            );
          const raw: unknown = await response.json();
          validate(raw);
          const entry = { expires: Date.now() + ttl, data: raw };
          cache.set(url, entry);
          try { localStorage.setItem(`reeltara-cache:${url}`, JSON.stringify(entry)); } catch { /* Quota or private browsing. */ }
          if (typeof window !== "undefined") window.dispatchEvent(new Event("catalog-updated"));
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
  if (hit) { void task.catch(() => {}); return validate(hit.data); }
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
