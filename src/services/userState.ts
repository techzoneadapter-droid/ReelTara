import { canPlay } from "./legal";
import type {
  Country,
  Entitlement,
  Movie,
  PlaybackProgress,
  WatchHistory,
  WatchlistEntry,
} from "../types/movie";
import {
  LocalUserStateRepository,
  type UserState,
  type UserStateRepository,
} from "../storage/userState";
export { LocalUserStateRepository } from "../storage/userState";
export type { UserState, UserStateRepository } from "../storage/userState";
const key = "reeltara-user-v1";
const repository: UserStateRepository = new LocalUserStateRepository();
let state = repository.read();
let failed = false;
const listeners = new Set<() => void>();
function update(next: UserState) {
  state = next;
  failed = !repository.write(state);
  listeners.forEach((fn) => fn());
}
export const UserStateService = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  snapshot: () => state,
  storageFailed: () => failed,
  setCountry(country: Country) {
    update({ ...state, country });
  },
  viewed(movie: Movie) {
    update({
      ...state,
      viewed: [
        { movie, viewedAt: Date.now() },
        ...state.viewed.filter((v) => v.movie.id !== movie.id),
      ].slice(0, 100),
    });
  },
  trailer(movieId: string) {
    update({
      ...state,
      trailers: [
        { movieId, watchedAt: Date.now() },
        ...state.trailers.filter((v) => v.movieId !== movieId),
      ].slice(0, 100),
    });
  },
  refresh() {
    state = repository.read();
    listeners.forEach((fn) => fn());
  },
};
export const WatchlistService = {
  has(id: string) {
    return state.watchlist.some((entry) => entry.movie.id === id);
  },
  toggle(movie: Movie) {
    update({
      ...state,
      watchlist: this.has(movie.id)
        ? state.watchlist.filter((e) => e.movie.id !== movie.id)
        : [...state.watchlist, { movie, addedAt: Date.now() }],
    });
  },
  migrate(movies: Movie[]) {
    try {
      if (localStorage.getItem(key)) return;
      const ids: unknown = JSON.parse(
        localStorage.getItem("reeltara-watchlist") || "[]",
      );
      if (Array.isArray(ids) && ids.length)
        update({
          ...state,
          watchlist: movies
            .filter((m) => ids.includes(m.id))
            .map((movie) => ({ movie, addedAt: Date.now() })),
        });
    } catch {
      /* Invalid legacy data must not prevent startup. */
    }
  },
};
export const PlaybackService = {
  save(movie: Movie, currentTime: number, duration: number, ended = false) {
    if (
      !canPlay(movie) ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      !Number.isFinite(currentTime)
    )
      return;
    const completed = ended || currentTime / duration >= 0.95;
    const progress = {
      ...state.progress,
      [movie.id]: {
        movie,
        currentTime: Math.min(Math.max(currentTime, 0), duration),
        duration,
        lastWatched: Date.now(),
        completed,
      },
    };
    update({
      ...state,
      progress: Object.fromEntries(
        Object.entries(progress)
          .sort((a, b) => b[1].lastWatched - a[1].lastWatched)
          .slice(0, 100),
      ),
    });
  },
  resume(id: string) {
    const p = state.progress[id];
    return p && !p.completed ? p.currentTime : 0;
  },
  continuing() {
    return Object.values(state.progress)
      .filter((p) => !p.completed && p.currentTime > 0)
      .sort((a, b) => b.lastWatched - a.lastWatched);
  },
};
