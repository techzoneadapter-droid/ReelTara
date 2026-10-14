import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
export function publicHttps(value,{originOnly=false}={}){
 try{const u=new URL(value);const h=u.hostname.toLowerCase();if(u.protocol!=='https:'||!h||u.username||u.password||u.hash)return false;
 if(originOnly&&(u.pathname!=='/'||u.search))return false;
 if(h==='localhost'||h.endsWith('.localhost')||h==='example.com'||h.endsWith('.example.com')||h==='example.org'||h.endsWith('.example')||h.endsWith('.invalid')||h.endsWith('.test')||h==='[::1]'||/^\[(?:f[cd]|fe80)/.test(h))return false;
 const n=h.split('.').map(Number);if(n.length===4&&n.every(x=>Number.isInteger(x)&&x>=0&&x<=255)&&([0,10,127].includes(n[0])||n[0]>=224||n[0]===169&&n[1]===254||n[0]===172&&n[1]>=16&&n[1]<=31||n[0]===192&&n[1]===168||n[0]===192&&n[1]===0&&n[2]===2||n[0]===198&&n[1]===51&&n[2]===100||n[0]===203&&n[1]===0&&n[2]===113))return false;
 return true;}catch{return false;}
}
export function evaluatePreflight(environment=process.env,root=process.cwd()){
 const env=n=>String(environment[n]||'').trim();const checks=[];const add=(name,ok,message)=>checks.push({name,status:ok?'PASS':'BLOCKED',message});
 const file=p=>existsSync(resolve(root,p));
 add('Production HTTPS backend',publicHttps(env('VITE_PUBLIC_API_BASE_URL'),{originOnly:true}),'Provide a verified public HTTPS API origin; placeholders/private URLs are rejected. Run backend smoke tests separately.');
 add('Privacy policy URL',publicHttps(env('PLAY_PRIVACY_POLICY_URL')),'Published accurate public policy URL required.');
 add('Support/contact URL',publicHttps(env('PLAY_SUPPORT_URL')),'Published support contact page required.');
 for(const [name,key,message] of [['Owner-approved rights','PLAY_RIGHTS_APPROVED','Owner-reviewed commercial rights dossier for assets/territories/ads required.'],['Data Safety reviewed','PLAY_DATA_SAFETY_APPROVED','Owner approval based on deployed SDK/network behavior required.'],['Package identifier approved','PLAY_APPLICATION_ID_APPROVED','Confirm permanent app ID and ownership.'],['Release signing configured','PLAY_SIGNING_VERIFIED','Verify signing securely off Git.']])add(name,env(key)==='true',message);
 add('Android package present',file('android/app/build.gradle'),'Native project required.');
 let pkg;try{pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));}catch{}
 add('Frontend dependency manifest',!!pkg?.scripts?.build,'Build script required.');
 return checks;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const checks=evaluatePreflight();for(const c of checks)console.log(`[${c.status}] ${c.name}: ${c.message}`);
 const blocked=checks.filter(c=>c.status==='BLOCKED').length;console.log(`Summary: ${checks.length-blocked} PASS, ${blocked} BLOCKED`);process.exitCode=blocked?1:0;
}
