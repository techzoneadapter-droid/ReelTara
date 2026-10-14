import { freeCatalogResponse } from '../server/freeCatalog.mjs';
import { handleCors } from '../server/cors.mjs';
export default async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).end();
  const result = await freeCatalogResponse();
  res.setHeader('Cache-Control', result.status === 200 ? 'public, s-maxage=900, stale-while-revalidate=900' : 'no-store');
  res.status(result.status).json(result.body);
}
