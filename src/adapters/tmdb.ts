import type {
  Country,
  Genre,
  Movie,
  MovieDetails,
  StreamingProvider,
  Trailer,
} from "../types/movie";
import { array, num, object, request, str, AppError } from "../services/http";
import { legalUrl, preferredTrailer } from "../services/legal";
const endpoint = (path: string, country: Country, query = "", page = 1) =>
  `/api/tmdb?path=${encodeURIComponent(path)}&region=${country}&page=${page}${query ? `&query=${encodeURIComponent(query)}` : ""}`;
const artwork = (path: unknown, size = "w500") =>
  /^\/[\w.-]+$/.test(str(path))
    ? `https://image.tmdb.org/t/p/${size}${path}`
    : "";
let genreList: Genre[] = [];
const genreName = (value: unknown) =>
  str(value) === "Science Fiction" ? "Sci-Fi" : str(value);
export function mapMovie(value: unknown): Movie {
  const m = object(value);
  if (!num(m.id) || !str(m.title))
    throw new AppError("invalid_response", "Movie data is incomplete.");
  const ids = array(m.genre_ids).filter(
    (v): v is number => typeof v === "number",
  );
  const names = array(m.genres).map((v) => genreName(object(v).name));
  return {
    id: `tmdb:${m.id}`,
    tmdbId: num(m.id),
    title: str(m.title),
    originalTitle: str(m.original_title),
    releaseDate: str(m.release_date),
    runtime: num(m.runtime) || undefined,
    voteCount: num(m.vote_count),
    year: Number(str(m.release_date).slice(0, 4)) || 0,
    genre:
      names.join(" · ") ||
      genreList
        .filter((g) => ids.includes(g.id))
        .map((g) => g.name)
        .join(" · ") ||
      "Unknown",
    genreIds: ids,
    rating: num(m.vote_average),
    duration: num(m.runtime) ? `${num(m.runtime)}m` : "Runtime unavailable",
    certificate: "",
    poster: artwork(m.poster_path),
    backdrop: artwork(m.backdrop_path, "w1280"),
    overview: str(m.overview) || "Overview unavailable.",
    director: "Not listed",
    cast: [],
    provider: "",
    providerUrl: "",
    origin: "tmdb",
    contentMode: "discovery",
  };
}
export const TmdbAdapter = {
  async genres(country: Country) {
    const data = await request(endpoint("genre/movie/list", country), object, 604800000);
    if (!Array.isArray(data.genres))
      throw new AppError("invalid_response", "Genres unavailable.");
    genreList = data.genres.map((v) => {
      const g = object(v);
      return { id: num(g.id), name: genreName(g.name) };
    });
    return genreList;
  },
  async list(path: string, country: Country, query = "", page = 1) {
    const data = await request(endpoint(path, country, query, page), object, path.includes("trending") ? 7200000 : path.includes("upcoming") ? 43200000 : 21600000);
    if (!Array.isArray(data.results))
      throw new AppError("invalid_response", "Catalog unavailable.");
    return data.results.map(mapMovie);
  },
  async details(id: string, country: Country): Promise<MovieDetails> {
    if (!/^tmdb:\d+$/.test(id))
      throw new AppError("movie_not_found", "Movie not found.");
    const key = id.split(":")[1];
    const [data, providersResult] = await Promise.all([
      request(endpoint(`movie/${key}`, country), object, 86400000),
      request(endpoint(`movie/${key}/watch/providers`, country), object).catch(
        () => null,
      ),
    ]);
    const movie = mapMovie(data);
    const credits = object(data.credits || {});
    const cast = array(credits.cast)
      .slice(0, 20)
      .map((v) => {
        const c = object(v);
        return {
          id: num(c.id),
          name: str(c.name),
          character: str(c.character),
          profile: artwork(c.profile_path),
        };
      });
    const crew = array(credits.crew).map((v) => {
      const c = object(v);
      return { id: num(c.id), name: str(c.name), job: str(c.job) };
    });
    const trailers: Trailer[] = array(
      object(data.videos || {}).results,
    ).flatMap((v) => {
      const t = object(v);
      return t.site === "YouTube" &&
        (t.type === "Trailer" || t.type === "Teaser")
        ? [
            {
              id: str(t.id),
              provider: "youtube" as const,
              videoId: str(t.key),
              sourceName: "YouTube",
              sourcePageUrl: `https://www.youtube.com/watch?v=${str(t.key)}`,
              name: str(t.name),
              official: t.official === true,
              type: t.type,
            },
          ]
        : [];
    });
    const region = object(
      object(providersResult?.results || {})[country] || {},
    );
    const url = legalUrl(str(region.link));
    const providers: StreamingProvider[] = [];
    for (const [field, kind] of [
      ["free", "free"],
      ["ads", "ads"],
      ["flatrate", "subscription"],
      ["rent", "rent"],
      ["buy", "buy"],
    ] as const) {
      if (url)
        for (const item of array(region[field])) {
          const p = object(item);
          providers.push({
            id: num(p.provider_id),
            name: str(p.provider_name),
            kind,
            url,
            country,
            logoUrl: artwork(p.logo_path, "w92"),
            destination: "availability",
          });
        }
    }
    const trailer = preferredTrailer(trailers);
    return {
      ...movie,
      genres: array(data.genres).map((v) => {
        const g = object(v);
        return { id: num(g.id), name: genreName(g.name) };
      }),
      credits: { cast, crew },
      cast: cast.map((c) => c.name),
      director:
        crew
          .filter((c) => c.job === "Director")
          .map((c) => c.name)
          .join(", ") || "Not listed",
      trailers,
      trailer,
      trailerUrl: trailer
        ? `https://www.youtube.com/watch?v=${trailer.videoId}`
        : undefined,
      providers,
      providerStatus: !providersResult
        ? "unavailable"
        : providers.length
          ? "available"
          : "empty",
      provider: providers[0]?.name || "",
      providerUrl: url || "",
    };
  },
};
