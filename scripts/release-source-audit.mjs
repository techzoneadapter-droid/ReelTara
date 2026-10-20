import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {probeMedia,curatedCandidate} from '../server/sourceVerification.mjs';
const sources=JSON.parse(readFileSync('src/data/freeSources.json','utf8'));
const metadata=new Map();
async function archiveMetadata(id){
  if(!metadata.has(id))metadata.set(id,fetch('https://archive.org/metadata/'+id,{signal:AbortSignal.timeout(20000)}).then(r=>{if(!r.ok)throw Error('Metadata HTTP '+r.status);return r.json();}));
  return metadata.get(id);
}
const films=await Promise.all(Object.entries(sources).map(async([id,s])=>({id,sourcePageUrl:s.sourcePageUrl,declaredLicense:s.licenseUrl,files:await Promise.all([s.playbackUrl,...s.fallbackPlaybackUrls].map(async(url,index)=>{
  try{
    const parts=new URL(url).pathname.split('/'),identifier=parts[2],name=decodeURIComponent(parts.slice(3).join('/'));
    const data=await archiveMetadata(identifier),file=data.files?.find(f=>f.name===name);
    const probe=await probeMedia(curatedCandidate(id,index));
    return {url,metadataTitle:data.metadata?.title,metadataCreator:data.metadata?.creator,metadataLicense:data.metadata?.licenseurl,file:file?{name:file.name,format:file.format,size:file.size,md5:file.md5,sha1:file.sha1}:null,transport:{ok:probe.ok,status:probe.status,mime:probe.contentType,range:probe.rangeSupported},note:'Uploader metadata and transport are supporting evidence; creator licensing and complete credit roll must be reviewed independently.'};
  }catch(error){return {url,error:String(error.message)};}
}))})));
const urls=[...readFileSync('src/data/movies.ts','utf8').matchAll(/trailerUrl: "(https:\/\/www.youtube.com\/watch\?v=[\w-]+)"/g)].map(m=>m[1]);
const trailers=await Promise.all(urls.map(async url=>{
  try{const r=await fetch('https://www.youtube.com/oembed?format=json&url='+encodeURIComponent(url),{signal:AbortSignal.timeout(15000)});if(!r.ok)return {url,http:r.status};const b=await r.json();return {url,http:r.status,title:b.title,author:b.author_name,authorUrl:b.author_url};}
  catch{return {url,error:'unavailable'};}
}));
const report={checkedAt:new Date().toISOString(),films,trailers};mkdirSync('docs/qa/release',{recursive:true});writeFileSync('docs/qa/release/source-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
