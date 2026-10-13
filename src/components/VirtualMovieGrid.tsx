import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Movie } from '../types/movie';
import { MovieCard } from './ui';

/** Keep the existing responsive grid; mount only viewport rows plus overscan. */
export function VirtualMovieGrid({ movies, saved, onSelect, onSave, wide = false, trailer = false }: {
  movies: Movie[]; saved: ReadonlySet<string>; onSelect: (movie: Movie) => void; onSave: (movie: Movie) => void; wide?: boolean; trailer?: boolean;
}) {
  const grid = useRef<HTMLDivElement>(null);
  const [windowed, setWindowed] = useState({ start: 0, end: 30, before: 0, after: 0 });
  useLayoutEffect(() => {
    const element = grid.current;
    if (!element) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const style = getComputedStyle(element);
      const columns = Math.max(1, style.gridTemplateColumns.split(' ').filter(Boolean).length);
      const gap = parseFloat(style.rowGap) || 0;
      const card = element.querySelector<HTMLElement>('.movie-card');
      const height = card?.getBoundingClientRect().height || 300;
      const step = height + gap;
      const rows = Math.ceil(movies.length / columns);
      const top = element.getBoundingClientRect().top;
      const first = Math.min(Math.max(0, rows - 1), Math.max(0, Math.floor(-top / step) - 3));
      const last = Math.min(rows, Math.max(first + 1, Math.ceil((innerHeight - top) / step) + 3));
      const next = { start: first * columns, end: Math.min(movies.length, last * columns), before: first ? first * step - gap : 0, after: last < rows ? (rows - last) * step - gap : 0 };
      setWindowed(previous => Object.keys(next).every(key => previous[key as keyof typeof next] === next[key as keyof typeof next]) ? previous : next);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    measure();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule); };
  }, [movies, wide]);
  // Re-measure after a new slice mounts, so row estimates match the real cards.
  useEffect(() => { window.dispatchEvent(new Event('resize')); }, [windowed.start]);
  return <div ref={grid} className={`movie-grid ${wide ? 'wide-grid' : ''}`} data-catalog-total={movies.length}>
    {windowed.before > 0 && <div aria-hidden="true" style={{ gridColumn: '1 / -1', height: windowed.before }} />}
    {movies.slice(windowed.start, windowed.end).map(movie => <MovieCard key={movie.id} movie={movie} saved={saved.has(movie.id)} onSelect={onSelect} onSave={onSave} wide={wide} trailer={trailer} />)}
    {windowed.after > 0 && <div aria-hidden="true" style={{ gridColumn: '1 / -1', height: windowed.after }} />}
  </div>;
}
