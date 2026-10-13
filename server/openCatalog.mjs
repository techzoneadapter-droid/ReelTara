import { cached } from './cache.mjs';
const PAGE_SIZE = 25;
const queues = new Map(), cooldowns = new Map();
async function fetchJson(url, accept = 'application/json') {
  const host = new URL(url).hostname;
  const previous = queues.get(host) || Promise.resolve();
  const task = previous.catch(() => {}).then(async () => {
    if ((cooldowns.get(host) || 0) > Date.now()) throw new Error('source_rate_limited');
    const response = await fetch(url, { headers: { Accept: accept, 'User-Agent': 'ReelTara/0.1 (https://github.com/techzoneadapter-droid/ReelTara)' }, signal: AbortSignal.timeout(20000) });
    if (response.status === 429) {
      cooldowns.set(host, Date.now() + Math.max(60, Number(response.headers?.get('retry-after')) || 60) * 1000);
    }
    if (!response.ok) throw new Error('source_' + response.status);
    return response.json();
  });
  const tail = task.then(() => new Promise(resolve => setTimeout(resolve, host === 'query.wikidata.org' ? 1000 : 550)), () => {});
  queues.set(host, tail);
  return task;
}
const clean = text => String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const tvMovie = item => {
  const s = item.show || item._embedded?.show || item;
  if (!Number.isInteger(s?.id) || !s?.name) return null;
  return { id: 'tvmaze:' + s.id, title: s.name, originalTitle: s.name, releaseDate: s.premiered || '', year: Number(String(s.premiered || '').slice(0,4)) || 0,
    genre: (s.genres || []).join(' · ') || 'TV Series', rating: Number(s.rating?.average) || 0, runtime: s.runtime || s.averageRuntime || undefined, duration: s.averageRuntime ? s.averageRuntime + 'm' : 'TV Series', certificate: '',
    // API metadata licensing does not establish the rights of poster photographs.
    poster: '', backdrop: '', overview: clean(s.summary), director: '', cast: [], provider: '', providerUrl: s.url || '', origin: 'open_data', contentMode: 'discovery',
    latestEpisodeDate: item.airdate || '',
    source: {name:'TVmaze', sourceUrl:s.url || 'https://www.tvmaze.com/', licenseUrl:'https://www.tvmaze.com/api', license:'CC BY-SA', attribution:'TVmaze (metadata)', verified:false}
  };
};
const wdMovie = b => {
  const qid = String(b.item?.value || '').split('/').pop();
  if (!/^Q\d+$/.test(qid) || !b.itemLabel?.value) return null;
  const date = String(b.date?.value || '').slice(0,10);
  return { id:'wikidata:'+qid, title:b.itemLabel.value, originalTitle:b.itemLabel.value, releaseDate:date, year:Number(date.slice(0,4)) || 0,
    genre:b.genres?.value || 'Film', rating:0, duration:'Film', certificate:'', poster:'', backdrop:'', overview:'Film metadata from Wikidata.', director:b.directors?.value || '', countryOfOrigin:b.countries?.value || '', cast:[], provider:'', providerUrl:'https://www.wikidata.org/wiki/'+qid,
    origin:'open_data', contentMode:'discovery', source:{name:'Wikidata',sourceUrl:'https://www.wikidata.org/wiki/'+qid,licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',license:'CC0',attribution:'Wikidata',verified:false}
  };
};
async function tvmaze(page, query, country, feed) {
  let rows;
  if (query) rows = await cached('tv-search:'+query, 900000, () => fetchJson('https://api.tvmaze.com/search/shows?q='+encodeURIComponent(query)));
  else if (feed === 'recent') {
    const date = new Date().toISOString().slice(0,10);
    rows = await cached('tv-schedule:'+country+':'+date, 900000, async () => {
      const parts = await Promise.allSettled([fetchJson('https://api.tvmaze.com/schedule?country='+country+'&date='+date), fetchJson('https://api.tvmaze.com/schedule/web?country=&date='+date)]);
      if (parts.every(p=>p.status === 'rejected')) throw new Error('schedule_unavailable');
      return parts.flatMap(p=>p.status === 'fulfilled' && Array.isArray(p.value) ? p.value : []);
    });
  } else {
    // The index has 250 IDs per provider page. Consume all ten chunks; never discard 190 shows.
    const providerPage = Math.floor((page-1)/10), offset = ((page-1)%10)*PAGE_SIZE;
    rows = await cached('tv-index:'+providerPage, 86400000, async () => {try{return await fetchJson('https://api.tvmaze.com/shows?page='+providerPage);}catch(e){if(e.message==='source_404')return [];throw e;}});
    const items = rows.slice(offset, offset+PAGE_SIZE).map(tvMovie).filter(Boolean);
    return {items, hasMore:rows.length>0};
  }
  const mapped = [...new Map(rows.map(tvMovie).filter(Boolean).map(m=>[m.id,m])).values()];
  return {items:mapped.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE), hasMore:mapped.length>page*PAGE_SIZE};
}
async function wikidata(country, page, query, feed) {
  const countryId = country === 'PH' ? 'Q928' : 'Q668';
  const term = JSON.stringify(query.toLowerCase());
  const q = `SELECT ?item ?itemLabel ?date (GROUP_CONCAT(DISTINCT ?directorLabel;separator=" · ") AS ?directors) (GROUP_CONCAT(DISTINCT ?genreLabel;separator=" · ") AS ?genres) (GROUP_CONCAT(DISTINCT ?countryLabel;separator=" · ") AS ?countries) WHERE {
    { SELECT ?item (MIN(?released) AS ?date) WHERE { ?item wdt:P495 wd:${countryId}; wdt:P31 wd:Q11424; wdt:P577 ?released. ${query ? '?item rdfs:label ?name. FILTER(LANG(?name)="en" && CONTAINS(LCASE(STR(?name)), '+term+'))' : 'FILTER(?released >= "2020-01-01T00:00:00Z"^^xsd:dateTime)'} ${feed === "upcoming" ? `FILTER(?released > "${new Date().toISOString().slice(0,10)}T23:59:59Z"^^xsd:dateTime)` : ""} } GROUP BY ?item ORDER BY DESC(?date) ?item LIMIT ${PAGE_SIZE+1} OFFSET ${(page-1)*PAGE_SIZE} }
    OPTIONAL {?item wdt:P57 ?director.} OPTIONAL {?item wdt:P136 ?genre.} OPTIONAL {?item wdt:P495 ?country.}
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?item rdfs:label ?itemLabel. ?director rdfs:label ?directorLabel. ?genre rdfs:label ?genreLabel. ?country rdfs:label ?countryLabel. }
  } GROUP BY ?item ?itemLabel ?date ORDER BY DESC(?date) ?item`;
  const body = await fetchJson('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(q), 'application/sparql-results+json');
  const rows = body.results?.bindings || [];
  return {items:rows.slice(0,PAGE_SIZE).map(wdMovie).filter(Boolean), hasMore:rows.length>PAGE_SIZE};
}
export async function openCatalogResponse(input) {
  const p = new URL(input,'http://localhost').searchParams;
  const id = p.get('id');
  if(id) {
    if(!/^tvmaze:\d+$/.test(id)) return {status:400,body:{error:'invalid_id'}};
    try {
      const body = await cached('open-detail:'+id,3600000,async()=>{
        const n=id.split(':')[1];
        const show=await fetchJson('https://api.tvmaze.com/shows/'+n+'?embed=cast');
        const episodes=await fetchJson('https://api.tvmaze.com/shows/'+n+'/episodes');
        return {item:{...tvMovie(show),cast:(show._embedded?.cast||[]).map(c=>c.person?.name).filter(Boolean)},episodes:episodes.map(e=>({id:e.id,name:e.name,season:e.season,number:e.number,airdate:e.airdate,runtime:e.runtime})),updatedAt:new Date().toISOString()};
      });return {status:200,body};
    }catch{return {status:502,body:{error:'source_unavailable'}};}
  }
  const source = p.get('source') || 'all', country = p.get('country') === 'PH' ? 'PH' : 'IN';
  const page = Math.max(1,Math.min(50,Math.floor(Number(p.get('page'))||1)));
  const query = (p.get('query')||'').trim().slice(0,60), feed = ['recent','upcoming'].includes(p.get('feed')) ? p.get('feed') : 'index';
  if (!['all','tvmaze','wikidata'].includes(source)) return {status:400,body:{error:'invalid_source'}};
  try {
    const body = await cached(['open-v2',source,country,page,query,feed].join(':'), query || feed === 'recent' ? 900000 : 3600000, async()=>{
      const names = source === 'all' ? ['wikidata','tvmaze'] : [source];
      const parts = await Promise.allSettled(names.map(name => name === 'tvmaze' ? tvmaze(page,query,country,feed) : wikidata(country,page,query,feed)));
      if (parts.every(p=>p.status === 'rejected')) throw new Error('sources_unavailable');
      const items = [...new Map(parts.flatMap(p=>p.status==='fulfilled'?p.value.items:[]).map(m=>[m.id,m])).values()];
      const hasMore = page < 50 && parts.some(p=>p.status==='fulfilled' && p.value.hasMore);
      return {items,page,hasMore,totalPages:hasMore?50:page,partial:parts.some(p=>p.status==='rejected'),sources:names.map((name,i)=>({name,status:parts[i].status,count:parts[i].status==='fulfilled'?parts[i].value.items.length:0})),updatedAt:new Date().toISOString()};
    });
    return {status:200,body};
  } catch { return {status:502,body:{error:'sources_unavailable'}}; }
}
