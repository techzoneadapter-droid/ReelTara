import { movies as seeds } from "../data/movies";
import type {
  Catalog,
  Country,
  Movie,
  MovieDetails,
  SearchResult,
} from "../types/movie";
import { TmdbAdapter } from "./tmdb";
import { UserStateService } from "./userState";
import { youtubeKey } from "./legal";
export interface CatalogAdapter {
  home(country: Country): Promise<Catalog>;
  search(query: string, country: Country): Promise<SearchResult>;
  details(movie: Movie, country: Country): Promise<MovieDetails>;
}
const unique = (items: Movie[]) => [
  ...new Map(items.map((m) => [m.id, m])).values(),
];
export const fallbackCatalog: Catalog = {
  movies: seeds,
  trending: seeds.filter((m) => !m.free),
  popular: seeds.filter((m) => !m.free),
  nowPlaying: [],
  upcoming: [],
  free: seeds.filter((m) => m.free),
  genres: [],
  status: "fallback",
  message: "Curated catalog · Live API unavailable.",
};
let available = seeds;
const homeCache = new Map<Country, { value: Catalog; expires: number }>();
export const MovieService: CatalogAdapter & { retry(): void } = {
  retry() {
    homeCache.clear();
  },
  async home(country) {
    const cached = homeCache.get(country);
    if (cached && cached.expires > Date.now()) return cached.value;
    const genres = await TmdbAdapter.genres(country).catch(() => []);
    const results = await Promise.allSettled(
      [
        "trending/movie/week",
        "movie/popular",
        "movie/now_playing",
        "movie/upcoming",
      ].map((path) => TmdbAdapter.list(path, country)),
    );
    const lists = results.map((r) => (r.status === "fulfilled" ? r.value : []));
    const live = results.some((r) => r.status === "fulfilled");
    const partial = results.some((r) => r.status === "rejected");
    const result: Catalog = {
      genres,
      trending: lists[0].length ? lists[0] : fallbackCatalog.trending,
      popular: lists[1].length ? lists[1] : fallbackCatalog.popular,
      nowPlaying: lists[2],
      upcoming: lists[3],
      free: fallbackCatalog.free,
      movies: unique([
        ...lists.flat(),
        ...(live ? fallbackCatalog.free : seeds),
      ]),
      status: live && !partial ? "live" : "fallback",
      message: !live
        ? "Live API unavailable. Browsing the curated catalog."
        : partial
          ? "Some live sections are unavailable. Curated fallback is shown where needed."
          : undefined,
    };
    available = unique([...available, ...result.movies]);
    homeCache.set(country, {
      value: result,
      expires: Date.now() + (live ? 300_000 : 30_000),
    });
    return result;
  },
  async search(query, country) {
    const normalized = query.trim().toLowerCase();
    const user = UserStateService.snapshot();
    const local = unique([
      ...available,
      ...user.watchlist.map((e) => e.movie),
      ...user.viewed.map((e) => e.movie),
    ]).filter((m) => m.title.toLowerCase().includes(normalized));
    if (!normalized) return { movies: available, status: "fallback" };
    try {
      const result = await TmdbAdapter.list("search/movie", country, query);
      available = unique([...result, ...available]).slice(0, 300);
      return {
        movies: unique([...result, ...local.filter((m) => m.free)]),
        status: "live",
      };
    } catch {
      return {
        movies: local,
        status: "fallback",
        message:
          "Search API unavailable. Showing matching saved catalog titles.",
      };
    }
  },
  async details(movie, country) {
    if (movie.origin === "tmdb" || movie.tmdbId) {
      try {
        const live = await TmdbAdapter.details(
          movie.tmdbId ? `tmdb:${movie.tmdbId}` : movie.id,
          country,
        );
        return { ...live, id: movie.id };
      } catch (error) {
        if (movie.origin === "tmdb") throw error;
        // Curated cards retain their known metadata when live detail is unavailable.
      }
    }
    // Refresh persisted movie records with the reviewed playback registry.
    const resolved =
      seeds.find((seed) => seed.id === movie.id && seed.freeSource) || movie;
    const key = youtubeKey(movie.trailerUrl);
    return {
      ...resolved,
      genres: [],
      credits: {
        cast: movie.cast.map((name, id) => ({ id, name })),
        crew: [{ id: 0, name: movie.director, job: "Director" }],
      },
      trailers: key
        ? [
            {
              id: key,
              key,
              site: "YouTube",
              type: "Trailer",
              official: true,
              name: "Official Trailer",
            },
          ]
        : [],
      providers: [],
      providerStatus: "unavailable",
    };
  },
};
