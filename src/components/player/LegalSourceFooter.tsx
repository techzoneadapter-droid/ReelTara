import type { Movie } from "../../types/movie";
import { legalUrl } from "../../services/legal";
export function LegalSourceFooter({
  movie,
  showSource = true,
}: {
  movie: Movie;
  showSource?: boolean;
}) {
  return (
    <footer className="legal-source-footer">
      <p>{movie.freeSource?.attribution || movie.source?.attribution}</p>
      <a
        href={legalUrl(
          movie.freeSource?.licenseUrl || movie.source?.licenseUrl,
        )}
        target="_blank"
        rel="noopener noreferrer"
      >
        {movie.freeSource?.licenseType || movie.source?.license}
      </a>
      {showSource && (
        <a
          href={legalUrl(
            movie.freeSource?.sourcePageUrl || movie.source?.sourceUrl,
          )}
          target="_blank"
          rel="noopener noreferrer"
        >
          View Legal Source
        </a>
      )}
    </footer>
  );
}
