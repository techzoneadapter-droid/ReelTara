import { useEffect, useState } from "react";
import type { Country, SearchResult } from "../types/movie";
import { fallbackCatalog, MovieService } from "../services/catalog";
import { clearCache } from "../services/http";
export function useCatalog(country: Country) {
  const [catalog, setCatalog] = useState(fallbackCatalog);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    if (revision === 0) setLoading(true);
    MovieService.home(country)
      .then((data) => {
        if (active) setCatalog(data);
      })
      .catch(() => {
        if (active) setCatalog(fallbackCatalog);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [country, revision]);
  useEffect(() => {
    if (catalog.status !== 'live') return;
    let active = true;
    void MovieService.hotTrailers(country).then(hotTrailers => {
      if (active) setCatalog(previous => previous.hotTrailers === hotTrailers ? previous : { ...previous, hotTrailers });
    });
    return () => { active = false; };
  }, [country, catalog.status, catalog.trending]);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible' && navigator.onLine) setRevision(v => v + 1); };
    const timer = setInterval(refresh, 300000);
    window.addEventListener("free-catalog-updated", refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener("free-catalog-updated", refresh); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  return {
    catalog,
    loading,
    retry: () => {
      clearCache();
      MovieService.retry();
      setRevision((v) => v + 1);
    },
  };
}
export function useMovieSearch(
  query: string,
  country: Country,
  enabled: boolean,
  revision = 0,
) {
  const [result, setResult] = useState<SearchResult>({
    movies: [],
    status: "fallback",
  });
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled || !query.trim()) {
      setLoading(false);
      setResult({ movies: [], status: "fallback" });
      return;
    }
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      MovieService.search(query, country)
        .then((data) => {
          if (active) setResult(data);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, country, enabled, revision]);
  return { ...result, loading };
}
