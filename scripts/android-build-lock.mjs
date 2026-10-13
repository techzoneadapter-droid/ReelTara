import {openSync,closeSync,readFileSync,writeFileSync,mkdirSync,unlinkSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
// Lock only this workspace's generated Android files; never stop another process.
export async function withAndroidBuildLock(task,{lockPath=resolve('.cache/android-usb/native-build.lock'),timeoutMs=600000}={}) {
 mkdirSync(dirname(lockPath),{recursive:true});const started=Date.now();let fd,announced=false;
 while(fd===undefined){
  try{fd=openSync(lockPath,'wx');writeFileSync(fd,JSON.stringify({pid:process.pid,startedAt:Date.now()}));}
  catch(error){
   if(error.code!=='EEXIST')throw error;
   try {const owner=JSON.parse(readFileSync(lockPath,'utf8'));if(Number.isInteger(owner.pid)&&owner.pid>0){
     try{process.kill(owner.pid,0);}catch(e){if(e.code==='ESRCH'){unlinkSync(lockPath);continue;}}
   }}catch{/* A writer may still be creating the lock; wait rather than stealing it. */}
   if(Date.now()-started>timeoutMs)throw Error('Another ReelTara native build still owns the workspace. Wait for it to finish before retrying.');
   if(!announced){console.log('[Native] Waiting for the other ReelTara build/sync to finish.');announced=true;}
   await new Promise(r=>setTimeout(r,250));
  }
 }
 try{return await task();}finally{closeSync(fd);try{if(JSON.parse(readFileSync(lockPath,'utf8')).pid===process.pid)unlinkSync(lockPath);}catch{}}
}
