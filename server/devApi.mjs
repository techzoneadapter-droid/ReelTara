import {handleCors} from './cors.mjs';
import {sendJson} from './httpResponse.mjs';
export function getMiddleware(loader,cache='no-store'){
 return async(req,res)=>{
  if(handleCors(req,res))return;
  if(req.method!=='GET'){res.setHeader('Cache-Control','no-store');return sendJson(res,405,{error:'method_not_allowed'});}
  try{const result=await loader(req);res.setHeader('Cache-Control',result.status===200?cache:'no-store');sendJson(res,result.status,result.body);}
  catch{res.setHeader('Cache-Control','no-store');sendJson(res,503,{error:'backend_unavailable'});}
 };
}
