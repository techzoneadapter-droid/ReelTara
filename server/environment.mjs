import { loadEnv } from 'vite';

// Called only by the Node development server. The returned token is never
// assigned to Vite's client environment, define map or native configuration.
export function serverToken(mode = 'development', cwd = process.cwd()) {
  return (process.env.TMDB_READ_ACCESS_TOKEN || loadEnv(mode, cwd, 'TMDB_').TMDB_READ_ACCESS_TOKEN || '').trim();
}
