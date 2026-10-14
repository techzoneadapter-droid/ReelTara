import {cached, json} from './cache.mjs';
import {fetchJson} from './catalogFetch.mjs';
import {openLicense,clean} from './sourceVerification.mjs';
const imageUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['upload.wikimedia.org','thumb.wikimedia.org'].includes(u.hostname)&&u.pathname.startsWith('/wikipedia/commons/')?u.href:'';}catch{return '';}};
export function licensedArtwork(page, info=page?.imageinfo?.[0]) {
 const m=info?.extmetadata||{};
 const poster=imageUrl(info?.thumburl);
 const source=info?.descriptionurl;
 if(page?.missing!==undefined||!poster||!openLicense(m.LicenseUrl?.value)||!clean(m.Artist?.value)||m.Restrictions?.value)return;
 try{const u=new URL(source);if(u.protocol!=='https:'||u.hostname!=='commons.wikimedia.org'||!u.pathname.startsWith('/wiki/File:'))return;}catch{return;}
 return {posterUrl:poster,backdropUrl:imageUrl(info.responsiveUrls?.['2'])||poster,sourcePageUrl:source,licenseUrl:m.LicenseUrl.value.replace(/^http:/,'https:'),licenseType:clean(m.LicenseShortName?.value),attribution:clean(m.Artist.value),credit:clean(m.Credit?.value),licenseVerified:true,checkedAt:new Date().toISOString(),modification:'Resized thumbnail; displayed cropped to fit.'};
}
// Resolve only the exact file linked by the film entity, never a title-search guess.
export async function resolveArtwork(files) {
 const titles=[...new Set(files.filter(Boolean).map(value=>{try{return 'File:'+decodeURIComponent(new URL(value).pathname.split('/').pop());}catch{return '';}}).filter(t=>t.startsWith('File:')&&t.length<300&&!/[|\x00-\x1f]/.test(t)))].slice(0,50);
 if(!titles.length)return new Map();
 return cached('artwork-v1:'+titles.join('|'),86400000,async()=>{
  const p=new URLSearchParams({action:'query',format:'json',titles:titles.join('|'),redirects:'1',prop:'imageinfo',iiprop:'url|mime|extmetadata',iiurlwidth:'320'});
  const data=await json('https://commons.wikimedia.org/w/api.php?'+p);const byTitle=new Map();
  for(const page of Object.values(data.query?.pages||{})){const art=licensedArtwork(page);if(art&&/^image\//.test(page.imageinfo?.[0]?.mime||''))byTitle.set(page.title.replace(/_/g,' '),art);}
  for(const alias of [...data.query?.normalized||[],...data.query?.redirects||[]]){const a=byTitle.get(alias.to?.replace(/_/g,' '));if(a)byTitle.set(alias.from?.replace(/_/g,' '),a);}
  return byTitle;
 },{staleMs:0});
}
export async function attachArtwork(items) {
 const imdbs=[...new Set(items.map(i=>i.artworkImdb).filter(s=>/^tt\d{7,10}$/.test(s||'')))].slice(0,25);
 if(imdbs.length)try{
  const linked=await cached('imdb-art-v1:'+imdbs.join(','),86400000,async()=>{
   const query='SELECT ?imdb (SAMPLE(?art) AS ?image) WHERE { VALUES ?imdb { '+imdbs.map(s=>JSON.stringify(s)).join(' ')+' } ?item wdt:P345 ?imdb; wdt:P18 ?art. } GROUP BY ?imdb LIMIT 25';
   const body=await fetchJson('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(query),'application/sparql-results+json');return body.results?.bindings||[];
  },{staleMs:0});
  items=items.map(i=>({...i,artworkFile:i.artworkFile||linked.find(b=>b.imdb?.value===i.artworkImdb)?.image?.value}));
 }catch{/* Metadata remains usable when no exact licensed artwork can be resolved. */}
 const files=items.map(i=>i.artworkFile).filter(Boolean);let arts;
 try{arts=await resolveArtwork(files);}catch{arts=new Map();}
 return items.map(({artworkFile,artworkImdb,...item})=>{
  let art;try{const title='File:'+decodeURIComponent(new URL(artworkFile).pathname.split('/').pop());art=arts.get(title.replace(/_/g,' '));}catch{}
  return art?{...item,poster:art.posterUrl,backdrop:art.backdropUrl,artwork:art}:item;
 });
}
