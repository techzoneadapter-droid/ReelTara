import type { Country, Movie, MovieDetails, StreamingProvider, Trailer } from "../types/movie";
import { TmdbAdapter } from "../adapters/tmdb";
export interface DiscoveryAdapter {
  getTrending(country: Country, page?: number): Promise<Movie[]>;
  getPopular(country: Country, page?: number): Promise<Movie[]>;
  getNowPlaying(country: Country, page?: number): Promise<Movie[]>;
  getUpcoming(country: Country, page?: number): Promise<Movie[]>;
  getDiscover(country: Country, page?: number): Promise<Movie[]>;
  search(query: string, country: Country, page?: number): Promise<Movie[]>;
  getDetails(id: string, country: Country): Promise<MovieDetails>;
  getVideos(id: string, country: Country): Promise<Trailer[]>;
  getProviders(id: string, country: Country): Promise<StreamingProvider[]>;
}
export const DiscoveryCatalogAdapter: DiscoveryAdapter = {
  getTrending: (c, p) => TmdbAdapter.list("trending/movie/week", c, "", p),
  getPopular: (c, p) => TmdbAdapter.list("movie/popular", c, "", p),
  getNowPlaying: (c, p) => TmdbAdapter.list("movie/now_playing", c, "", p),
  getUpcoming: (c, p) => TmdbAdapter.list("movie/upcoming", c, "", p),
  getDiscover: (c, p) => TmdbAdapter.list("discover/movie", c, "", p),
  search: (q, c, p) => TmdbAdapter.list("search/movie", c, q, p),
  getDetails: TmdbAdapter.details,
  getVideos: async (id, c) => (await TmdbAdapter.details(id, c)).trailers,
  getProviders: async (id, c) => (await TmdbAdapter.details(id, c)).providers,
};
