import type { Country, Movie, MovieDetails, StreamingProvider, Trailer } from "../types/movie";
import { OpenCatalogAdapter } from "../adapters/openCatalog";
const sorted = (list:Movie[], sort:"new"|"rating") => [...list].sort((a,b)=>sort==="new"?(b.year-a.year):(b.rating-a.rating));
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
  getTrending: async (c,p) => sorted(await OpenCatalogAdapter.list(c,p),"rating"),
  getPopular: async (c,p) => sorted(await OpenCatalogAdapter.list(c,p),"rating"),
  getNowPlaying: async (c,p) => sorted(await OpenCatalogAdapter.list(c,p),"new"),
  getUpcoming: async () => [], // Neither open source guarantees upcoming film releases.
  getDiscover: (c,p) => OpenCatalogAdapter.list(c,p),
  search: (q,c,p) => OpenCatalogAdapter.list(c,p,q),
  getDetails: async (id,c) => { const results=await OpenCatalogAdapter.list(c,1); const m=results.find(x=>x.id===id); if(!m) throw new Error("movie_not_found"); return OpenCatalogAdapter.details(m); },
  getVideos: async () => [],
  getProviders: async () => [],
};
