import { cached } from './cache.mjs';

const TIMEOUT = 8000;
const fetchJson = async (url, accept = 'application/json') => {
  const response = await fetch(url, { headers: { Accept: accept, 'User-Agent': 'ReelTara/0.1 (open metadata; contact via project GitHub)' }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!response.ok) throw new Error('source_' + response.status);
  return response.json();
};
const clean = text => String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const tvMovie = item => {
  const s = item.show || item;
  if (!s?.id || !s?.name) return null;
  const rating = Number(s.rating?.average) || 0;
  return { id: 'tvmaze:' + s.id, title: s.name, originalTitle: s.name,
    releaseDate: s.premiered || '', year: Number(String(s.premiered || '').slice(0,4)) || 0,
    genre: (s.genres || []).join(' · ') || 'TV Series', rating, runtime: s.runtime || s.averageRuntime || undefined,
    duration: s.averageRuntime ? s.averageRuntime + 'm' : 'TV Series', certificate: '',
    poster: s.image?.medium || '', backdrop: s.image?.original || s.image?.medium || '',
    overview: clean(s.summary), director: '', cast: [], provider: '', providerUrl: s.url || '',
    origin: 'open_data', contentMode: 'discovery', voteCount: 0, releaseType: 'TV',
    source: {name:'TVmaze',sourceUrl:s.url || '',licenseUrl:'https://www.tvmaze.com/api',license:'CC BY-SA',attribution:'TVmaze',verified:false}
  };
};
const wdMovie = b => {
  const qid = String(b.item?.value || '').split('/').pop();
  if (!/^Q\d+$/.test(qid) || !b.itemLabel?.value) return null;
  const date = String(b.date?.value || '').slice(0,10);
  return { id:'wikidata:'+qid, title:b.itemLabel.value, originalTitle:b.itemLabel.value,
    releaseDate:date, year:Number(date.slice(0,4)) || 0, genre:'Film', rating:0,
    duration:'Film', certificate:'', poster:'', backdrop:'',
    overview:'Film metadata from Wikidata; synopsis not available.', director:b.directorLabel?.value || '',
    cast:[], provider:'', providerUrl:'https://www.wikidata.org/wiki/'+qid,
    origin:'open_data', contentMode:'discovery', source:{name:'Wikidata',sourceUrl:'https://www.wikidata.org/wiki/'+qid,licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',license:'CC0',attribution:'Wikidata',verified:false}
  };
};
async function tvmaze(page, query) {
  const endpoint = query ? 'https://api.tvmaze.com/search/shows?q='+encodeURIComponent(query)
    : 'https://api.tvmaze.com/shows?page='+Math.max(0,page-1);
  const result = await fetchJson(endpoint);
  return (Array.isArray(result) ? result : []).map(tvMovie).filter(Boolean)
    .sort((a,b) => (b.rating-a.rating) || (b.year-a.year)).slice(0,60);
}
async function wikidata(country, page, query) {
  // Use direct CC0 statements; no embedded Commons images until asset license checks.
  const countryId = country === 'PH' ? 'Q928' : 'Q668';
  const recent = new Date().getFullYear()-4;
  const q = query
    ? `SELECT DISTINCT ?item ?itemLabel ?date WHERE { ?item wdt:P31 wd:Q11424; rdfs:label ?itemLabel. FILTER(LANG(?itemLabel)="en" && CONTAINS(LCASE(STR(?itemLabel)), "${query.replace(/["\\]/g,'').slice(0,50).toLowerCase()}")) OPTIONAL { ?item wdt:P577 ?date. } } LIMIT 35`
    : `SELECT DISTINCT ?item ?itemLabel ?date WHERE { ?item wdt:P31 wd:Q11424; wdt:P495 wd:${countryId}; wdt:P577 ?date. FILTER(?date >= "${recent}-01-01T00:00:00Z"^^xsd:dateTime) SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } ORDER BY DESC(?date) LIMIT 100 OFFSET ${(page-1)*100}`;
  const url = 'https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(q);
  const body = await fetchJson(url,'application/sparql-results+json');
  return (body.results?.bindings || []).map(wdMovie).filter(Boolean);
}
export async function openCatalogResponse(input) {
  const url = new URL(input,'http://localhost');
  const source = url.searchParams.get('source') || 'all';
  const country = url.searchParams.get('country') === 'PH' ? 'PH' : 'IN';
  const page = Math.max(1,Math.min(15,Number(url.searchParams.get('page'))||1));
  const query = (url.searchParams.get('query')||'').slice(0,60);
  if (!['all','tvmaze','wikidata'].includes(source)) return {status:400,body:{error:'invalid_source'}};
  try {
    return await cached('open:'+source+':'+country+':'+page+':'+query,3600000,async()=>{
      const tasks = [];
      if (source !== 'wikidata') tasks.push(tvmaze(page,query));
      if (source !== 'tvmaze') tasks.push(wikidata(country,page,query));
      const parts = await Promise.allSettled(tasks);
      const items = [...new Map(parts.filter(p=>p.status==='fulfilled').flatMap(p=>p.value).map(m=>[m.id,m])).values()];
      if (!parts.some(p=>p.status==='fulfilled')) return {status:502,body:{error:'sources_unavailable'}};
      return {status:200,body:{items,partial:parts.some(p=>p.status==='rejected'),sources:source,updatedAt:new Date().toISOString()}};
    });
  } catch { return {status:502,body:{error:'sources_unavailable'}}; }
}
