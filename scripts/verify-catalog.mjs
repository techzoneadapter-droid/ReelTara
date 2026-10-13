import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
let local;try{local=JSON.parse(readFileSync('.cache/android-usb/session.json','utf8')).url;}catch{}
const base=new URL(process.env.CATALOG_VERIFY_BASE_URL||local||'http://localhost:5188');
if(base.username||base.password||(base.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(base.hostname)))throw new Error('Use HTTPS backend or loopback development URL without credentials.');
const checks=[];
for(const country of ['IN','PH'])for(const params of [{source:'wikidata',page:'1'},{source:'wikidata',page:'2'},{source:'tvmaze',page:'1'},{source:'tvmaze',feed:'recent',page:'1'},{source:'tvmaze',query:'Sacred Games',page:'1'}]){
 const url=new URL('/api/open-catalog',base);url.search=new URLSearchParams({country,...params});
 const response=await fetch(url,{signal:AbortSignal.timeout(60000)}),body=await response.json();
 if(!response.ok||!Array.isArray(body.items)||!body.items.length)throw new Error('Live open catalog failed: '+url.search+' HTTP '+response.status);
 if(body.items.some(m=>m.free||m.playable||m.poster||m.backdrop))throw new Error('Discovery rights boundary failed.');
 checks.push({country,...params,count:body.items.length,hasMore:body.hasMore,sources:body.sources,titles:body.items.slice(0,3).map(m=>({id:m.id,title:m.title,date:m.releaseDate,latestEpisode:m.latestEpisodeDate,director:m.director}))});
}
const result={checkedAt:new Date().toISOString(),backend:base.origin,source:'actual Wikidata and TVmaze upstream responses, no fixtures or API credentials',checks};mkdirSync('.cache/catalog',{recursive:true});writeFileSync('.cache/catalog/live-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
