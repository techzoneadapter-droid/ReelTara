import test from 'node:test';
import assert from 'node:assert/strict';
import { openCatalogResponse } from '../server/openCatalog.mjs';

test('open catalog maps TVmaze discovery data without a TMDB token', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async url => {
    assert.match(String(url), /^https:\/\/api\.tvmaze\.com\//);
    return {ok:true,json:async()=>[{id:901234,name:'Demo Series',premiered:'2025-01-10',genres:['Drama'],rating:{average:7.5},image:{medium:'https://static.tvmaze.com/example.jpg'},url:'https://www.tvmaze.com/shows/901234/demo'}]};
  };
  try {
    const response = await openCatalogResponse('/api/open-catalog?source=tvmaze&country=IN&page=1');
    assert.equal(response.status,200);
    assert.equal(response.body.items[0].id,'tvmaze:901234');
    assert.equal(response.body.items[0].contentMode,'discovery');
    assert.equal(response.body.items[0].free,undefined);
  } finally {globalThis.fetch=original;}
});

test('invalid source is rejected without network activity', async () => {
  const result = await openCatalogResponse('/api/open-catalog?source=invalid');
  assert.equal(result.status,400);
});

test('all TV search results can be paged; images and playback rights are never inferred', async () => {
  const original=globalThis.fetch;
  globalThis.fetch=async()=>({ok:true,json:async()=>Array.from({length:76},(_,i)=>({id:880000+i,name:'Paged Show '+i,genres:['Drama'],image:{medium:'https://static.tvmaze.com/unreviewed.jpg'}}))});
  try {
    const a=await openCatalogResponse('/?source=tvmaze&query=pagination-fixture&page=1');
    const b=await openCatalogResponse('/?source=tvmaze&query=pagination-fixture&page=2');
    const d=await openCatalogResponse('/?source=tvmaze&query=pagination-fixture&page=4');
    assert.equal(a.body.items.length,25);assert.equal(b.body.items.length,25);assert.equal(d.body.items.length,1);assert.equal(d.body.hasMore,false);
    assert(!a.body.items.some(x=>b.body.items.some(y=>x.id===y.id)));
    assert(a.body.items.every(m=>!m.poster&&!m.backdrop&&!m.source.verified&&!m.free));
  }finally{globalThis.fetch=original;}
});
test('an unavailable source is not retained as a successful cached response',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('temporary outage');};
  try {
    assert.equal((await openCatalogResponse('/?source=tvmaze&query=retry-fixture')).status,502);
    globalThis.fetch=async()=>({ok:true,json:async()=>[{show:{id:990001,name:'Recovered Show'}}]});
    const recovered=await openCatalogResponse('/?source=tvmaze&query=retry-fixture');assert.equal(recovered.status,200);assert.equal(recovered.body.items[0].title,'Recovered Show');
  }finally{globalThis.fetch=original;}
});
test('Wikidata query is country-bound, groups dates before pagination and enriches CC0 text',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async url=>{
  const q=new URL(url).searchParams.get('query');assert.match(q,/wd:Q928/);assert.match(q,/GROUP BY \?item/);assert.match(q,/OFFSET 0/);assert.match(q,/LIMIT 101/);assert.match(q,/wdt:P57/);
  return {ok:true,json:async()=>({results:{bindings:Array.from({length:26},(_,i)=>({item:{value:'http://www.wikidata.org/entity/Q'+(12345+i)},itemLabel:{value:'New Philippine Film'},date:{value:'2026-10-01T00:00:00Z'},directors:{value:'Director'},genres:{value:'Drama'},countries:{value:'Philippines'}}))}})};
 };
 try{const r=await openCatalogResponse('/?source=wikidata&country=PH&page=2&query=fixture');assert.equal(r.status,200);assert.equal(r.body.items[0].director,'Director');assert.equal(r.body.items[0].source.license,'CC0');assert.equal(r.body.items[0].year,2026);}finally{globalThis.fetch=original;}
});

test('four Wikidata UI pages share one bounded request and the next block has distinct IDs',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async url=>{calls++;const q=new URL(url).searchParams.get('query');assert.match(q,/LIMIT 101/);const base=Number(q.match(/OFFSET (\d+)/)[1]);return {ok:true,json:async()=>({results:{bindings:Array.from({length:101},(_,i)=>({item:{value:'http://www.wikidata.org/entity/Q'+(900000+base+i)},itemLabel:{value:'Batch Film '+(base+i)}}))}})};};
 try{const ids=[];for(let page=1;page<=4;page++){const r=await openCatalogResponse('/?source=wikidata&country=IN&page='+page+'&query=batchCacheRegression');assert.equal(r.body.items.length,25);ids.push(...r.body.items.map(m=>m.id));}assert.equal(calls,1);assert.equal(new Set(ids).size,100);const next=await openCatalogResponse('/?source=wikidata&country=IN&page=5&query=batchCacheRegression');assert.equal(calls,2);assert(!ids.includes(next.body.items[0].id));}finally{globalThis.fetch=original;}
});
