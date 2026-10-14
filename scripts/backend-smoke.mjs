import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {publicHttps} from './play-release-preflight.mjs';
const local=process.argv.includes('--local');let raw=process.argv.slice(2).find(x=>!x.startsWith('--'))||process.env.BACKEND_SMOKE_URL||process.env.VITE_PUBLIC_API_BASE_URL;
if(local&&!raw)try{raw=JSON.parse(readFileSync('.cache/android-usb/session.json','utf8')).url;}catch{}
if(!raw){console.error('BLOCKED: provide the actual HTTPS backend origin, or --local for development-only verification.');process.exitCode=2;}else{
 const base=new URL(raw);const allowed=local?base.protocol==='http:'&&['localhost','127.0.0.1'].includes(base.hostname)&&!base.username&&!base.password:publicHttps(raw,{originOnly:true});
 if(!allowed)throw Error('Invalid backend origin; no private/placeholder URLs or credentials for production smoke.');
 const checks=[];
 async function request(path,method='GET',origin='https://localhost'){
  const response=await fetch(new URL(path,base),{method,headers:{Origin:origin,Accept:'application/json'},signal:AbortSignal.timeout(60000),redirect:'error'});
  const body=method==='GET'?await response.json():null;return {response,body};
 }
 for(const [name,path,validate] of [['health','/api/health',b=>b.service==='ReelTara'&&b.apiVersion===1],['IN real film metadata','/api/open-catalog?country=IN&source=wikidata',b=>Array.isArray(b.items)&&b.items.length>0&&b.items.every(m=>/^wikidata:Q\d+$/.test(m.id)&&!m.free)],['PH real film metadata','/api/open-catalog?country=PH&source=wikidata',b=>Array.isArray(b.items)&&b.items.length>0&&b.items.every(m=>/^wikidata:Q\d+$/.test(m.id)&&!m.free)],['free catalog','/api/free-catalog',b=>Array.isArray(b.items)&&b.items.length>0&&b.items.every(m=>m.verifiedLegal&&m.licenseUrl)],['unreviewed playback rejected','/api/playback?url=https://archive.org/download/unreviewed/movie.mp4',b=>b.ok===false&&b.error==='unreviewed_source']]){
  try{const {response:r,body:b}=await request(path);const expected=name==='unreviewed playback rejected'?400:200;const ok=r.status===expected&&validate(b)&&r.headers.get('access-control-allow-origin')==='https://localhost'&&/origin/i.test(r.headers.get('vary')||'')&&(name!=='unreviewed playback rejected'||r.headers.get('cache-control')==='no-store');checks.push({name,status:ok?'PASS':'FAIL',http:r.status,count:b.items?.length});}catch{checks.push({name,status:'FAIL',error:'request_failed_or_invalid_json'});}
 }
 for(const [name,method,origin,expected] of [['native preflight','OPTIONS','https://localhost',204],['unknown origin denied','GET','https://not-approved.invalid',403],['unsupported method denied','POST','https://localhost',405]]){
  try{const {response:r}=await request('/api/health',method,origin);checks.push({name,status:r.status===expected&&r.headers.get('cache-control')==='no-store'?'PASS':'FAIL',http:r.status});}catch{checks.push({name,status:'FAIL'});}
 }
 const result={checkedAt:new Date().toISOString(),mode:local?'development loopback; does not verify deployed HTTPS':'actual public HTTPS',origin:base.origin,checks};mkdirSync('.cache/phase3',{recursive:true});writeFileSync('.cache/phase3/backend-smoke.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(checks.some(c=>c.status!=='PASS'))process.exitCode=1;
}
