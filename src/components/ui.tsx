import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Film,
  Play,
  Plus,
  Star,
} from "lucide-react";
import type { Movie } from "../types/movie";
import { legalUrl } from "../services/legal";

export function BrandLogo({ icon = false }: { icon?: boolean }) {
  return icon ? (
    <img className="brand-icon" src="/brand/icon.png" alt="ReelTara" />
  ) : (
    <span className="brand-logo">
      <img src="/brand/wordmark.png" alt="ReelTara" />
    </span>
  );
}
export function PrimaryButton({
  href,
  onClick,
  children,
}: {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  if (onClick)
    return (
      <button className="button primary" onClick={onClick}>
        {children}
      </button>
    );
  if (!legalUrl(href))
    return (
      <button className="button primary" disabled>
        {children}
      </button>
    );
  return (
    <a
      className="button primary"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
export function SecondaryButton({
  onClick,
  children,
  label,
  pressed,
}: {
  onClick: () => void;
  children: ReactNode;
  label?: string;
  pressed?: boolean;
}) {
  return (
    <button
      className="button secondary"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
    >
      {children}
    </button>
  );
}
export function ProviderButton({
  movie,
  onClick,
}: {
  movie: Movie;
  onClick?: () => void;
}) {
  if (onClick)
    return (
      <button className="button secondary" onClick={onClick}>
        Where to Watch <ArrowUpRight size={16} />
      </button>
    );
  const url = legalUrl(movie.source?.sourceUrl || movie.providerUrl);
  if (!url) return <span role="status">Provider availability not listed</span>;
  return (
    <a
      className="button secondary"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {movie.free ? "View Legal Source" : `Search ${movie.provider}`}{" "}
      <ArrowUpRight size={16} />
    </a>
  );
}
export function RatingBadge({ rating }: { rating: number }) {
  return (
    <span className="rating">
      <Star size={12} fill="currentColor" /> <b>{rating.toFixed(1)}</b>
    </span>
  );
}
export function SectionHeader({
  title,
  subtitle,
  onMore,
  icon,
}: {
  title: string;
  subtitle?: string;
  onMore?: () => void;
  icon?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        <h2>
          {icon}
          {title}
        </h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {onMore && (
        <button onClick={onMore}>
          View all <ChevronRight size={15} />
        </button>
      )}
    </div>
  );
}
export function MovieImage({
  src,
  title,
  eager = false,
}: {
  src: string;
  title: string;
  eager?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(!src);
  useEffect(() => {
    setLoaded(false);
    setFailed(!src);
  }, [src]);
  return (
    <div className={`movie-image ${loaded || failed ? "" : "skeleton"}`}>
      {failed || !src ? (
        <div className="image-fallback">
          <BrandLogo icon />
          <span>{title}</span>
        </div>
      ) : (
        <img
          src={src}
          alt={title}
          loading={eager ? "eager" : "lazy"}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
export function MovieCard({
  movie,
  onSelect,
  saved,
  onSave,
  wide = false,
  trailer = false,
}: {
  movie: Movie;
  onSelect: (movie: Movie) => void;
  saved: boolean;
  onSave: (movie: Movie) => void;
  wide?: boolean;
  trailer?: boolean;
}) {
  return (
    <article className={`movie-card ${wide ? "wide" : ""}`}>
      <div className="poster-wrap">
        <button
          className="poster-button"
          onClick={() => onSelect(movie)}
          aria-label={`View ${movie.title}`}
        >
          <MovieImage src={movie.poster} title={movie.title} />
          <span className="poster-shade" />
          {movie.free && <span className="badge">FREE TO WATCH</span>}
          {trailer && (
            <span className="trailer-play">
              <Play size={22} fill="currentColor" />
            </span>
          )}
          <span className="poster-caption">
            {trailer
              ? "TRAILER"
              : movie.free
                ? movie.source?.name.toUpperCase() || "OPEN MOVIE"
                : movie.certificate}
          </span>
        </button>
        <button
          className={`save-button ${saved ? "saved" : ""}`}
          aria-label={`${saved ? "Remove" : "Save"} ${movie.title}`}
          aria-pressed={saved}
          onClick={() => onSave(movie)}
        >
          {saved ? <Check size={15} /> : <Plus size={15} />}
        </button>
        {!trailer && <RatingBadge rating={movie.rating} />}
      </div>
      <button className="card-title" onClick={() => onSelect(movie)}>
        {movie.title}
      </button>
      <p>
        {movie.year}
        <span>•</span>
        {movie.genre}
        {trailer && (
          <>
            <span>•</span>Trailer
          </>
        )}
      </p>
    </article>
  );
}
export function EmptyState({
  title,
  text,
  action,
  onAction,
}: {
  title: string;
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="empty-state">
      <BrandLogo icon />
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="button primary" onClick={onAction}>
        <Film size={17} />
        {action}
      </button>
    </div>
  );
}
