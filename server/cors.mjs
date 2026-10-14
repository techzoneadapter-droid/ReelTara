import {sendJson,endResponse} from './httpResponse.mjs';
export function handleCors(req,res){
 res.setHeader('Cache-Control','no-store');
 const allowed=new Set(['https://localhost',...(process.env.APP_ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean)]);
 res.setHeader('Vary','Origin');const origin=req.headers?.origin;
 if(origin&&!allowed.has(origin)){res.setHeader('Cache-Control','no-store');sendJson(res,403,{error:'origin_not_allowed'});return true;}
 if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Accept, Content-Type');}
 if(req.method==='OPTIONS'){res.setHeader('Cache-Control','no-store');endResponse(res,204);return true;}
 return false;
}
