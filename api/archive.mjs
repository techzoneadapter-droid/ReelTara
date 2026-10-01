import { archiveResponse } from '../server/archive.mjs';
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const result = await archiveResponse(req.url);
  res.setHeader('Cache-Control', result.status === 200 ? 'public, s-maxage=3600' : 'no-store');
  return res.status(result.status).json(result.body);
}
