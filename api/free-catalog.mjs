import { freeCatalogResponse } from '../server/freeCatalog.mjs';
import { handleCors } from '../server/cors.mjs';
export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).end();
  const result = await freeCatalogResponse();
  res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=86400');
  res.status(result.status).json(result.body);
}
