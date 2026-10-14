import test from 'node:test';import assert from 'node:assert/strict';
import {licensedArtwork,attachArtwork} from '../server/artwork.mjs';
import {reviewedArtwork,artworkCounts} from '../src/utils/artwork';
import {openCatalogResponse} from '../server/openCatalog.mjs';
import type {Movie} from '../src/types/movie';
const info={thumburl:'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Film.jpg/320px-Film.jpg',descriptionurl:'https://commons.wikimedia.org/wiki/File:Film.jpg',mime:'image/jpeg',extmetadata:{LicenseUrl:{value:'https://creativecommons.org/licenses/by-sa/4.0/'},Artist:{value:'<a>Author</a>'},LicenseShortName:{value:'CC BY-SA 4.0'}}};
test('artwork requires per-file commercial-compatible license, attribution, canonical source and safe URL',()=>{
 const a=licensedArtwork({title:'File:Film.jpg'},info);assert(a);assert.equal(a.attribution,'Author');assert(reviewedArtwork(a));
 for(const license of ['https://creativecommons.org/licenses/by-nc/4.0/','https://creativecommons.org/licenses/by-nd/4.0/','https://rights.invalid/'])assert.equal(licensedArtwork({}, {...info,extmetadata:{...info.extmetadata,LicenseUrl:{value:license}}}),undefined);
 assert.equal(licensedArtwork({}, {...info,extmetadata:{...info.extmetadata,Restrictions:{value:'personality rights'}}}),undefined);
 assert.equal(reviewedArtwork({...a,posterUrl:'https://static.tvmaze.com/unreviewed.jpg'}),undefined);
 assert.equal(reviewedArtwork({...a,checkedAt:'invalid'}),undefined);
 assert.equal(reviewedArtwork({...a,checkedAt:new Date(Date.now()-172800000).toISOString()}),undefined);
});
test('exact linked Commons image is retained without enabling full-film playback',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>({ok:true,status:200,json:async()=>({query:{pages:{1:{pageid:1,title:'File:Film.jpg',imageinfo:[info]}}}})}) as Response;
 try{const films=await attachArtwork([{id:'wikidata:Q999991',title:'Film',poster:'',backdrop:'',artworkFile:'http://commons.wikimedia.org/wiki/Special:FilePath/Film.jpg',free:false}]);assert.equal(films[0].poster,info.thumburl);assert.equal(films[0].free,false);assert(!('artworkFile' in films[0]));assert.equal(artworkCounts(films as Movie[]).licensed,1);}finally{globalThis.fetch=original;}
});
test('missing or rejected artwork preserves all movie metadata',async()=>{
 const films=await attachArtwork([{id:'wikidata:Q1',title:'No image',poster:'',backdrop:''}]);assert.equal(films.length,1);assert.equal(films[0].title,'No image');assert.equal(artworkCounts(films as Movie[]).placeholder,1);
});
test('recent releases constrain dates in the source query before pagination',async()=>{
 const original=globalThis.fetch;let checked=false;
 globalThis.fetch=async url=>{const q=new URL(String(url)).searchParams.get('query')||'';assert.match(q,/FILTER\(\?released <= "[0-9-]+T23:59:59Z"\^\^xsd:dateTime\)/);checked=true;return {ok:true,status:200,json:async()=>({results:{bindings:[]}})} as Response;};
 try{const response=await openCatalogResponse('/?source=wikidata&feed=recent&query=date-bound-regression');assert.equal(response.status,200);assert(checked);}finally{globalThis.fetch=original;}
});
