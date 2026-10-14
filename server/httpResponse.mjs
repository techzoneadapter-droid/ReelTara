// Supports both Vercel's augmented response and Node/Vite ServerResponse.
export function sendJson(res,status,body){
 res.setHeader('Content-Type','application/json');
 if(typeof res.status==='function')res.status(status);else res.statusCode=status;
 if(typeof res.json==='function')return res.json(body);
 res.end(JSON.stringify(body));
}
export function endResponse(res,status){if(typeof res.status==='function')res.status(status);else res.statusCode=status;res.end();}
