import { enableMobileCors } from "./cors.mjs";
import { freeCatalogResponse } from '../server/freeCatalog.mjs';
export default async function handler(req, res) {
  if (enableMobileCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).end();
  const result = await freeCatalogResponse();
  // Per-origin CORS must never be replaced by a response cached without Origin.
  res.setHeader('Cache-Control', 'no-store');
  res.status(result.status).json(result.body);
}
