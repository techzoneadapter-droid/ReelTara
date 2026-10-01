import type { Movie } from "../types/movie";
import { array, object, request, str, AppError } from "../services/http";
// Only reviewed open films may enter this catalog. Archive metadata alone is not rights verification.
const reviewedItems: Record<string, { movieId: string; attribution: string }> =
  {
    BigBuckBunny_328: {
      movieId: "bunny",
      attribution: "© 2008 Blender Foundation · peach.blender.org",
    },
  };
export const ArchiveAdapter = {
  async resolve(identifier: string, movie: Movie): Promise<Movie> {
    const reviewed = reviewedItems[identifier];
    if (
      !reviewed ||
      reviewed.movieId !== movie.id ||
      movie.contentMode !== "free_legal"
    )
      throw new AppError(
        "legal_stream_unavailable",
        "Source has not been reviewed.",
      );
    const data = await request(
      `/api/archive?identifier=${encodeURIComponent(identifier)}`,
      object,
      3_600_000,
    );
    const meta = object(data.metadata || {});
    const license = str(meta.licenseurl).replace(/^http:/, "https:");
    if (
      !/^https:\/\/creativecommons\.org\/(licenses\/by\/3\.0(?:\/us)?|publicdomain\/(zero|mark)\/1\.0)\/?$/.test(
        license,
      ) ||
      meta.mediatype !== "movies"
    )
      throw new AppError(
        "legal_stream_unavailable",
        "Open license metadata is missing.",
      );
    const files = array(data.files)
      .map(object)
      .filter(
        (f) =>
          /\.mp4$/i.test(str(f.name)) &&
          /h\.?264|mpeg.?4|mp4/i.test(str(f.format)) &&
          !/(?:preview|trailer|sample|thumb)/i.test(str(f.name)) &&
          !/(?:preview|thumbnail)/i.test(str(f.format)) &&
          f.private !== "true" &&
          f.private !== true,
      )
      .sort((a, b) => {
        const rank = (f: Record<string, unknown>) =>
          /h\.?264/i.test(str(f.format))
            ? 0
            : /mpeg.?4/i.test(str(f.format))
              ? 1
              : 2;
        return (
          rank(a) - rank(b) ||
          Number(a.size || Infinity) - Number(b.size || Infinity)
        );
      });
    const file = files[0];
    return {
      ...movie,
      origin: "archive",
      freeSource: undefined,
      source: {
        name: "Internet Archive",
        sourceUrl: `https://archive.org/details/${identifier}`,
        playableUrl: file
          ? `https://archive.org/download/${identifier}/${encodeURIComponent(str(file.name))}`
          : undefined,
        license: license.includes("/by/")
          ? license.includes("/us")
            ? "CC BY 3.0 US"
            : "CC BY 3.0"
          : "Public domain",
        licenseUrl: license,
        attribution: reviewed.attribution,
        verified: true,
        archiveId: identifier,
      },
    };
  },
};
