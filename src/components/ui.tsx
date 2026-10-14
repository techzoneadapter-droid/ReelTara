import { memo, useMemo, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Film,
  Play,
  Plus,
  Star,
} from "lucide-react";
import { thumbnailCandidates, PLACEHOLDER_THUMBNAIL, firstThumbnailIndex, rememberBrokenThumbnail } from "../utils/thumbnails";
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
export function MovieImage({src,title,eager=false,movie,trailer=false,decorative=false}: {
  src:string;title:string;eager?:boolean;movie?:Movie;trailer?:boolean;decorative?:boolean;
}) {
  const candidates=useMemo(()=>thumbnailCandidates(movie,src,trailer),[src,movie?.poster,movie?.backdrop,movie?.origin,movie?.trailer,movie?.trailerUrl,trailer]);
  return <ResolvedMovieImage key={candidates.join('|')} candidates={candidates} title={title} eager={eager} decorative={decorative}/>;
}
const ResolvedMovieImage=memo(function ResolvedMovieImage({candidates,title,eager,decorative}:{candidates:string[];title:string;eager:boolean;decorative:boolean}) {
  const [index,setIndex]=useState(()=>firstThumbnailIndex(candidates));
  const [loaded,setLoaded]=useState(false);
  const src=candidates[index]||PLACEHOLDER_THUMBNAIL;
  const placeholder=src===PLACEHOLDER_THUMBNAIL;
  return <div className={`movie-image ${loaded||placeholder?'':'skeleton'}`} data-thumbnail-kind={placeholder?'placeholder':src.startsWith('https://i.ytimg.com/')?'youtube':'source'}>
    <img key={src} src={src} alt={decorative?'':title} loading={eager?'eager':'lazy'} decoding="async" fetchPriority={eager?'high':'auto'}
      style={{opacity:loaded||placeholder?1:0}}
      srcSet={src.includes('image.tmdb.org/t/p/w500/')?`${src.replace('/w500/','/w185/')} 185w, ${src.replace('/w500/','/w342/')} 342w, ${src} 500w`:undefined}
      sizes="(max-width: 600px) 46vw, (max-width: 1100px) 28vw, 220px" onLoad={()=>setLoaded(true)}
      onError={()=>{rememberBrokenThumbnail(src);setLoaded(false);setIndex(i=>Math.min(i+1,candidates.length-1));}}/>
    {placeholder&&!decorative&&<div className="image-fallback"><BrandLogo icon/><span>{title}</span></div>}
  </div>;
});
export const MovieCard = memo(function MovieCard({
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
          <MovieImage src={movie.poster} movie={movie} trailer={trailer} title={movie.title} />
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
});
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
