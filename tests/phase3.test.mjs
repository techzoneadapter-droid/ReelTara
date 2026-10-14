import test from 'node:test';import assert from 'node:assert/strict';
import {evaluatePreflight,publicHttps} from '../scripts/play-release-preflight.mjs';
import health from '../api/health.mjs';
import {getMiddleware} from '../server/devApi.mjs';
import {cached} from '../server/cache.mjs';
test('expired serverless cache awaits and deduplicates refresh before responding',async()=>{
 await cached('phase3-refresh',1,async()=>({generation:1}));
 await new Promise(r=>setTimeout(r,5));
 let calls=0;
 const load=async()=>{calls++;await new Promise(r=>setTimeout(r,15));return {generation:2};};
 const results=await Promise.all([cached('phase3-refresh',1000,load,{staleMs:1000}),cached('phase3-refresh',1000,load,{staleMs:1000})]);
 assert.equal(calls,1);assert.deepEqual(results,[{generation:2},{generation:2}]);
});
function response(){const headers=new Map();const r={statusCode:200,body:undefined,setHeader:(k,v)=>headers.set(k.toLowerCase(),v),status:(s)=>{r.statusCode=s;return r;},json:b=>{r.body=b;},end:()=>{},headers};return r;}
test('release preflight stays blocked with absent approvals and rejects placeholder/private HTTPS',()=>{
 const checks=evaluatePreflight({});assert.equal(checks.filter(c=>c.status==='BLOCKED').length,7);
 for(const url of ['http://api.example.com','https://example.com','https://127.0.0.2','https://10.0.0.1','https://192.168.1.3','https://[::1]','https://user:password@api.real-domain.com','https://api.test','https://app.example','https://api.real-domain.com/?token=secret'])assert.equal(publicHttps(url,{originOnly:true}),false,url);
 assert.equal(publicHttps('https://api.real-domain.com',{originOnly:true}),true);
 for(const value of ['false','TRUE','1','yes'])assert.equal(evaluatePreflight({PLAY_RIGHTS_APPROVED:value}).find(c=>c.name==='Owner-approved rights').status,'BLOCKED');
});
test('production health contract enforces native CORS, no-store and HTTP methods',()=>{
 const res=response();health({method:'GET',headers:{origin:'https://localhost'}},res);assert.equal(res.statusCode,200);assert.equal(res.body.service,'ReelTara');assert.equal(res.headers.get('vary'),'Origin');assert.equal(res.headers.get('cache-control'),'no-store');assert.equal(res.headers.get('access-control-allow-origin'),'https://localhost');
 for(const [method,origin,status] of [['OPTIONS','https://localhost',204],['POST','https://localhost',405],['GET','https://unknown.invalid',403]]){const r=response();health({method,headers:{origin}},r);assert.equal(r.statusCode,status);assert.equal(r.headers.get('cache-control'),'no-store');}
});
test('dev middleware applies the production CORS/method/cache contract before any loader',async()=>{
 let calls=0;const handler=getMiddleware(async()=>{calls++;return {status:200,body:{items:[]}};},'public, s-maxage=900');
 const blocked=response();await handler({method:'GET',headers:{origin:'https://unapproved.invalid'}},blocked);assert.equal(calls,0);assert.equal(blocked.statusCode,403);
 const success=response();await handler({method:'GET',headers:{origin:'https://localhost'}},success);assert.equal(calls,1);assert.equal(success.headers.get('cache-control'),'public, s-maxage=900');
 const broken=response();await getMiddleware(async()=>{throw Error('private upstream details');})({method:'GET',headers:{}},broken);assert.equal(broken.statusCode,503);assert.equal(broken.headers.get('cache-control'),'no-store');assert.deepEqual(broken.body,{error:'backend_unavailable'});
});
