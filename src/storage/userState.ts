import type {
  Country,
  Entitlement,
  Movie,
  PlaybackProgress,
  WatchHistory,
  WatchlistEntry,
} from "../types/movie";
export type UserState = {
  version: 1;
  watchlist: WatchlistEntry[];
  viewed: WatchHistory[];
  trailers: { movieId: string; watchedAt: number }[];
  progress: Record<string, PlaybackProgress>;
  country: Country;
  preferences: { entitlement: Entitlement };
};
export interface UserStateRepository {
  read(): UserState;
  write(value: UserState): boolean;
}
const key = "reeltara-user-v1";
const initial = (): UserState => ({
  version: 1,
  watchlist: [],
  viewed: [],
  trailers: [],
  progress: {},
  country: "IN",
  preferences: {
    entitlement: { tier: "free", removeAds: false, cloudSync: false },
  },
});
const isMovie = (v: unknown): v is Movie =>
  !!v &&
  typeof v === "object" &&
  typeof (v as Movie).id === "string" &&
  typeof (v as Movie).title === "string" &&
  Array.isArray((v as Movie).cast) &&
  typeof (v as Movie).rating === "number" &&
  typeof (v as Movie).genre === "string";
export class LocalUserStateRepository implements UserStateRepository {
  read(): UserState {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || "null");
      if (!raw || raw.version !== 1) return initial();
      const validProgress = Object.entries(raw.progress || {}).filter(
        ([id, p]) => {
          const v = p as PlaybackProgress;
          return (
            v &&
            isMovie(v.movie) &&
            v.movie.id === id &&
            Number.isFinite(v.currentTime) &&
            Number.isFinite(v.duration) &&
            v.currentTime >= 0 &&
            v.duration > 0 &&
            Number.isFinite(v.lastWatched)
          );
        },
      );
      return {
        ...initial(),
        country: raw.country === "PH" ? "PH" : "IN",
        watchlist: Array.isArray(raw.watchlist)
          ? raw.watchlist
              .filter((v: WatchlistEntry) => v && isMovie(v.movie))
              .slice(0, 500)
          : [],
        viewed: Array.isArray(raw.viewed)
          ? raw.viewed
              .filter((v: WatchHistory) => v && isMovie(v.movie))
              .slice(0, 100)
          : [],
        trailers: Array.isArray(raw.trailers)
          ? raw.trailers
              .filter(
                (v: { movieId: string; watchedAt: number }) =>
                  v &&
                  typeof v.movieId === "string" &&
                  Number.isFinite(v.watchedAt),
              )
              .slice(0, 100)
          : [],
        progress: Object.fromEntries(validProgress.slice(0, 100)) as Record<
          string,
          PlaybackProgress
        >,
      };
    } catch {
      return initial();
    }
  }
  write(value: UserState) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }
}
