import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const parse = (path) => {
  try { return JSON.parse(readFileSync(resolve(path),'utf8')); } catch { return null; }
};
const file = (path) => existsSync(resolve(path));
const env = (name) => String(process.env[name] || '').trim();
const https = (s) => { try { const u = new URL(s); return u.protocol==='https:' && !!u.hostname && !u.username && !u.password && !['localhost','127.0.0.1'].includes(u.hostname); } catch { return false; } };
const checks = [];
const add = (name,ok,message) => checks.push({name,status:ok?'PASS':'BLOCKED',message});
const url = env('VITE_PUBLIC_API_BASE_URL');
add('Production HTTPS backend',https(url),'Set VITE_PUBLIC_API_BASE_URL to the verified HTTPS origin (public, not secret).');
add('Privacy policy URL',https(env('PLAY_PRIVACY_POLICY_URL')),'Published accurate public policy URL required.');
add('Support/contact URL',https(env('PLAY_SUPPORT_URL')),'Published support contact page required.');
add('Owner-approved rights',env('PLAY_RIGHTS_APPROVED')==='true','Rights dossier must cover each commercial metadata/image/video asset and territory.');
add('Data Safety reviewed',env('PLAY_DATA_SAFETY_APPROVED')==='true','Owner must approve declarations based on the deployed SDK/network behavior.');
add('Package identifier approved',env('PLAY_APPLICATION_ID_APPROVED')==='true','Owner confirms permanent app ID and Play ownership.');
add('Release signing configured',env('PLAY_SIGNING_VERIFIED')==='true','Verify release signing securely off repository.');
add('Android package present',file('android/app/build.gradle'),'Native Android project required.');
const packageJson = parse('package.json');
add('Frontend dependency manifest',!!packageJson?.scripts?.build,'Package build script must be available.');
const blocked = checks.filter(x=>x.status==='BLOCKED');
for(const x of checks) process.stdout.write(`[${x.status}] ${x.name}: ${x.message}\n`);
process.stdout.write(`Summary: ${checks.length-blocked.length} PASS, ${blocked.length} BLOCKED\n`);
process.exitCode = blocked.length ? 1 : 0;
