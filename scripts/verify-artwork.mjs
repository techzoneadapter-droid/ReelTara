import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const session=JSON.parse(readFileSync('.cache/android-usb/session.json','utf8'));
const body=await(await fetch(session.url+'/api/free-catalog?version=4',{signal:AbortSignal.timeout(60000)})).json();
const candidates=body.items.filter(m=>m.artwork?.licenseVerified);
const results=[];let index=0;
await Promise.all(Array.from({length:2},async()=>{
 while(index<candidates.length){const m=candidates[index++];let status,type;
  try{const r=await fetch(m.artwork.posterUrl,{signal:AbortSignal.timeout(15000)});status=r.status;type=r.headers.get('content-type');await r.body?.cancel();}catch{}
  results.push({id:m.id,title:m.title,source:m.artwork.sourcePageUrl,license:m.artwork.licenseUrl,attribution:m.artwork.attribution,poster:m.artwork.posterUrl,status,contentType:type,ok:status===200&&/^image\//.test(type||'')});
 }
}));
const report={checkedAt:new Date().toISOString(),mode:'real free catalog and image HTTP responses; UI decode measured separately',total:body.items.length,licensed:candidates.length,available:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,items:results};
mkdirSync('.cache/phase4',{recursive:true});writeFileSync('.cache/phase4/licensed-artwork.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,items:undefined},null,2));if(report.available<20)process.exitCode=1;
