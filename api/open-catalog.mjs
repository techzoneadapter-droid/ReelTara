import { handleCors } from '../server/cors.mjs';
import { openCatalogResponse } from '../server/openCatalog.mjs';
export default async function handler(req,res) {
  if(handleCors(req,res)) return;
  if(req.method !== 'GET') return res.status(405).json({error:'method_not_allowed'});
  const result = await openCatalogResponse(req.url);
  res.setHeader('Cache-Control', result.status===200?'public, s-maxage=900, stale-while-revalidate=3600':'no-store');
  return res.status(result.status).json(result.body);
}
