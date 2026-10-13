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
