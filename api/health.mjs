import {handleCors} from '../server/cors.mjs';
import {sendJson} from '../server/httpResponse.mjs';
export default function handler(req,res){
 if(handleCors(req,res))return;res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET')return sendJson(res,405,{error:'method_not_allowed'});
 return sendJson(res,200,{service:'ReelTara',apiVersion:1});
}
