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
    setLoading(true);
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
