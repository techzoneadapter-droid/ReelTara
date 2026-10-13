import {cap,gradle,run} from './android-tools.mjs';
import {withAndroidBuildLock} from './android-build-lock.mjs';
import {readFileSync} from 'node:fs';
const mode=process.argv[2]||'sync';
if(!['sync','verify'].includes(mode))throw Error('Use sync or verify');
await withAndroidBuildLock(async()=>{
 await run(process.execPath,['node_modules/typescript/bin/tsc','-b']);
 await run(process.execPath,['node_modules/vite/bin/vite.js','build']);
 await cap('sync','android');
 if(mode==='verify'){
  let port=5188;try{port=JSON.parse(readFileSync('.cache/android-usb/session.json','utf8')).port;}catch{}
  if(!Number.isInteger(port)||port<5188||port>5199)throw Error('Preview port must remain in 5188–5199');
  await gradle('assembleDebug','assembleRelease','bundleRelease','testDebugUnitTest',`-PusbPreviewPort=${port}`,'--no-daemon','--console=plain','--rerun-tasks');
 }
});
