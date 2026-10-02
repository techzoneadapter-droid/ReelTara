import test from "node:test";
import assert from "node:assert/strict";
import { canPlay, legalUrl, preferredTrailer } from "../src/services/legal";
import { movies } from "../src/data/movies";
import { AppError, clearCache, object, request } from "../src/services/http";
import { mapMovie } from "../src/services/tmdb";
import { tmdbResponse } from "../server/tmdb.mjs";

test("legal boundary blocks commercial playback and unsafe URLs", () => {
  assert.equal(canPlay(movies[0]), false);
  assert.equal(canPlay(movies.find((m) => m.id === "bunny")!), true);
  for (const url of [
    "http://archive.org/movie.mp4",
    "https://archive.org.evil.test/movie.mp4",
    "javascript:alert(1)",
    "https://user:pass@archive.org/x",
    "https://unknown.test/video.mp4",
  ])
    assert.equal(legalUrl(url), undefined);
  assert.equal(canPlay({ ...movies[0], contentMode: "free_legal" }), false);
  assert.equal(
    canPlay({
      ...movies[6],
      source: { ...movies[6].source!, verified: false },
    }),
    false,
  );
  assert.equal(
    canPlay(movies.find((m) => m.id === "sintel")!),
    true,
    "Sintel now has a reviewed MP4 source",
  );
});
test("official trailers take priority over teasers and malformed IDs", () => {
  const base = {
    id: "1",
    videoId: "abcdefghijk",
    provider: "youtube" as const,
    sourceName: "YouTube",
    name: "Video",
  };
  assert.equal(
    preferredTrailer([
      { ...base, id: "teaser", type: "Teaser", official: true },
      { ...base, id: "unofficial", type: "Trailer", official: false },
      { ...base, id: "official", type: "Trailer", official: true },
    ])?.id,
    "official",
  );
  assert.equal(
    preferredTrailer([
      { ...base, videoId: "<script>", type: "Trailer", official: true },
    ]),
    undefined,
  );
});
test("TMDB validates required fields and tolerates missing optional metadata", () => {
  assert.throws(() => mapMovie({ id: 1 }), AppError);
  const movie = mapMovie({ id: 1, title: "No assets" });
  assert.equal(movie.poster, "");
  assert.equal(movie.contentMode, "discovery");
  assert.deepEqual(movie.cast, []);
});
test("HTTP deduplicates, caches, limits retries, and rejects invalid responses", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  try {
    clearCache();
    globalThis.fetch = async () => {
      calls++;
      return new Response(JSON.stringify({ value: 1 }));
    };
    await Promise.all([request("/dedupe", object), request("/dedupe", object)]);
    await request("/dedupe", object);
    assert.equal(calls, 1);
    calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return new Response("{}", { status: 503 });
    };
    await assert.rejects(request("/failure", object), AppError);
    assert.equal(calls, 2);
    globalThis.fetch = async () => new Response("[]");
    await assert.rejects(request("/invalid", object), {
      code: "invalid_response",
    });
    globalThis.fetch = async () => new Response("{}", { status: 404 });
    await assert.rejects(request("/missing", object), {
      code: "movie_not_found",
    });
  } finally {
    globalThis.fetch = original;
  }
});
test("proxy only allows movie endpoints and fails without server credentials", async () => {
  assert.equal((await tmdbResponse("/?path=account/1", "")).status, 400);
  assert.equal((await tmdbResponse("/?path=movie/popular", "")).status, 503);
  assert.equal(
    (await tmdbResponse("/?path=https://evil.test", "")).status,
    400,
  );
});
test("local state migrates, persists watchlist, resumes, completes, and tolerates corruption", async () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) || null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  const {
    WatchlistService,
    PlaybackService,
    UserStateService,
    LocalUserStateRepository,
  } = await import("../src/services/userState");
  values.set("reeltara-watchlist", '["dune"]');
  WatchlistService.migrate(movies);
  assert.equal(WatchlistService.has("dune"), true);
  WatchlistService.toggle(movies[0]);
  assert.equal(WatchlistService.has("dune"), false);
  WatchlistService.toggle(movies[1]);
  assert.equal(
    new LocalUserStateRepository().read().watchlist[0].movie.id,
    "oppenheimer",
  );
  PlaybackService.save(movies[6], 30, 600);
  assert.equal(PlaybackService.resume(movies[6].id), 30);
  PlaybackService.save(movies[6], 580, 600);
  assert.equal(PlaybackService.resume(movies[6].id), 0);
  assert.equal(PlaybackService.continuing().length, 0);
  UserStateService.setCountry("PH");
  assert.equal(new LocalUserStateRepository().read().country, "PH");
  values.set("reeltara-user-v1", "{bad");
  assert.equal(new LocalUserStateRepository().read().country, "IN");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => {
        throw Error();
      },
      setItem: () => {
        throw Error();
      },
    },
  });
  assert.deepEqual(new LocalUserStateRepository().read().watchlist, []);
  UserStateService.setCountry("IN");
  assert.equal(UserStateService.storageFailed(), true);
});

test("Archive playback requires reviewed identity, license metadata and a public MP4", async () => {
  const { ArchiveAdapter } = await import("../src/services/archive");
  const bunny = movies.find((m) => m.id === "bunny")!;
  await assert.rejects(ArchiveAdapter.resolve("unreviewed_upload", bunny), {
    code: "legal_stream_unavailable",
  });
  const original = globalThis.fetch;
  try {
    clearCache();
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          metadata: { mediatype: "movies" },
          files: [{ name: "movie.mp4" }],
        }),
      );
    await assert.rejects(ArchiveAdapter.resolve("BigBuckBunny_328", bunny), {
      code: "legal_stream_unavailable",
    });
    clearCache();
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          metadata: {
            mediatype: "movies",
            licenseurl: "http://creativecommons.org/licenses/by/3.0/us/",
          },
          files: [
            { name: "private.mp4", private: true },
            { name: "movie.mkv" },
          ],
        }),
      );
    assert.equal(
      canPlay(await ArchiveAdapter.resolve("BigBuckBunny_328", bunny)),
      false,
    );
    clearCache();
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          metadata: {
            mediatype: "movies",
            licenseurl: "http://creativecommons.org/licenses/by/3.0/us/",
          },
          files: [
            { name: "preview.mp4", format: "h.264", size: "1" },
            { name: "trailer.mp4", size: "2" },
            { name: "generic.mp4", size: "100" },
            { name: "movie.mp4", format: "h.264", size: "2000" },
          ],
        }),
      );
    const movie = await ArchiveAdapter.resolve("BigBuckBunny_328", bunny);
    assert.equal(canPlay(movie), true);
    assert.equal(movie.source?.name, "Internet Archive");
    assert.match(movie.source!.playableUrl!, /\/movie.mp4$/);
  } finally {
    globalThis.fetch = original;
    clearCache();
  }
});

test("Archive metadata proxy rejects arbitrary identifiers and stream URLs", async () => {
  const { archiveResponse } = await import("../server/archive.mjs");
  for (const identifier of [
    "unreviewed",
    "https://evil.test/movie.mp4",
    "../secrets",
  ]) {
    assert.equal(
      (await archiveResponse(`/?identifier=${encodeURIComponent(identifier)}`))
        .status,
      400,
    );
  }
});

test("media probe rejects arbitrary URLs, HTML and unsafe redirects, cancels the body", async () => {
  const { playbackResponse } = await import("../server/playback.mjs");
  const url = movies.find((m) => m.id === "bunny")!.freeSource!.playbackUrl;
  const input = "/?url=" + encodeURIComponent(url);
  assert.equal(
    (await playbackResponse("/?url=https://evil.test/movie.mp4")).status,
    400,
  );
  assert.equal(
    (
      await playbackResponse(
        input,
        async () =>
          new Response("<html/>", { headers: { "Content-Type": "text/html" } }),
      )
    ).body.ok,
    false,
  );
  let cancelled = false;
  const good = await playbackResponse(
    input,
    async () =>
      new Response(
        new ReadableStream({
          cancel() {
            cancelled = true;
          },
        }),
        {
          status: 206,
          headers: {
            "Content-Type": "video/mp4",
            "Content-Range": "bytes 0-0/1000",
          },
        },
      ),
  );
  assert.equal(good.body.ok, true);
  assert.equal(good.body.rangeSupported, true);
  assert.equal(cancelled, true);
  let calls = 0;
  const unsafe = await playbackResponse(input, async () => {
    calls++;
    return new Response(null, {
      status: 302,
      headers: { Location: "http://127.0.0.1/internal" },
    });
  });
  assert.equal(unsafe.body.ok, false);
  assert.equal(calls, 1);
});

test("trailer priority requires reviewed direct sources and excludes fan uploads", () => {
  const official = { id: "yt", provider: "youtube" as const, videoId: "abcdefghijk", sourceName: "YouTube", name: "Trailer", type: "Trailer" as const, official: true };
  const direct = { ...official, id: "direct", provider: "direct" as const, verified: true, directPlaybackUrl: "https://download.blender.org/trailer.mp4", mimeType: "video/mp4", sourcePageUrl: "https://peach.blender.org/" };
  assert.equal(preferredTrailer([official, direct])?.id, "direct");
  assert.equal(preferredTrailer([{ ...direct, verified: false }, official])?.id, "yt");
  assert.equal(preferredTrailer([{ ...direct, directPlaybackUrl: "https://random.test/x.mp4" }, official])?.id, "yt");
  assert.equal(preferredTrailer([{ ...official, official: false }]), undefined);
  assert.equal(preferredTrailer([{ ...official, official: false, verified: true, id: "fallback" }, { ...official, type: "Teaser" }])?.id, "yt");
});

test("free catalog legal filter rejects ambiguous, noncommercial, malformed license metadata", async () => {
  const { openLicense } = await import('../server/freeCatalog.mjs');
  assert.equal(openLicense('https://creativecommons.org/licenses/by/4.0/'), true);
  assert.equal(openLicense('https://creativecommons.org/publicdomain/mark/1.0/'), true);
  for (const value of ['public domain', 'free movie', '', 'https://evil.test/by/4.0/', 'https://creativecommons.org/licenses/by-nc/4.0/']) assert.equal(openLicense(value), false);
});

test("server catalog cache deduplicates concurrent refreshes and serves stale data", async () => {
  const { cached } = await import('../server/cache.mjs');
  let calls = 0;
  const load = async () => { calls++; return { title: 'verified' }; };
  await Promise.all([cached('test-catalog', 1, load), cached('test-catalog', 1, load)]);
  assert.equal(calls, 1);
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.deepEqual(await cached('test-catalog', 1, async () => { throw new Error('offline'); }), { title: 'verified' });
});

test('dynamic verification derives license and file identity; never trusts client URLs or flags', async () => {
  const { playbackResponse } = await import('../server/playback.mjs');
  const meta = { metadata: { mediatype: 'movies', creator: 'Author', title: 'Film', licenseurl: 'https://creativecommons.org/licenses/by/4.0/' }, files: [{ name: 'movie.mp4', format: 'h.264' }, { name: 'private.mp4', format: 'h.264', private: true }, { name: 'trailer.mp4', format: 'h.264' }] };
  const calls: string[] = [];
  const fetcher = async (url: string) => {
    calls.push(url);
    return url.includes('/metadata/') ? new Response(JSON.stringify(meta)) : new Response(null, { status: 206, headers: { 'Content-Type': 'video/mp4' } });
  };
  const query = '/?provider=internet_archive&sourceId=dynamic-film&fileName=';
  const valid = await playbackResponse(query + 'movie.mp4', fetcher);
  assert.equal(valid.body.playable, true);
  assert.equal(valid.body.candidate.sourceProvider, 'internet_archive');
  assert.equal(valid.body.playbackUrl, 'https://archive.org/download/dynamic-film/movie.mp4');
  for (const name of ['private.mp4', 'trailer.mp4', '../movie.mp4', 'missing.mp4']) assert.equal((await playbackResponse(query + encodeURIComponent(name), fetcher)).status, 400);
  meta.metadata.licenseurl = 'https://creativecommons.org/licenses/by-nc/4.0/';
  assert.equal((await playbackResponse(query + 'movie.mp4&verifiedLegal=true', fetcher)).body.ok, false);
  calls.length = 0;
  for (const input of ['/?url=https://archive.org/download/random/movie.mp4', '/?provider=internet_archive&sourceId=..%2Fadmin&fileName=x.mp4', '/?provider=wikimedia&sourceId=https://evil.test', '/?provider=blender&sourceId=unknown']) assert.equal((await playbackResponse(input, fetcher)).status, 400);
  assert.equal(calls.length, 0);
});

test('Commons playback resolves canonical transcodes and rejects unsafe redirects on metadata and media', async () => {
  const { playbackResponse } = await import('../server/playback.mjs');
  const page = { pageid: 42, videoinfo: [{ url: 'https://upload.wikimedia.org/movie.webm', mime: 'video/webm', extmetadata: { LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' }, Artist: { value: 'Artist' } }, derivatives: [{ src: 'https://upload.wikimedia.org/movie.480p.webm', type: 'video/webm; codecs="vp9, opus"', transcodekey: '480p.vp9.webm', height: 480 }] }] };
  const input = '/?provider=wikimedia&sourceId=42&fileName=480p.vp9.webm';
  let calls = 0;
  const good = await playbackResponse(input, async (url: string) => {
    calls++;
    return url.includes('/w/api.php') ? new Response(JSON.stringify({ query: { pages: { 42: page } } })) : new Response(null, { status: 206, headers: { 'Content-Type': 'video/webm' } });
  });
  assert.equal(good.body.ok, true);
  assert.equal(good.body.candidate.mimeType, 'video/webm; codecs="vp9, opus"');
  assert.equal(calls, 2);
  for (const location of ['http://127.0.0.1/', 'https://upload.wikimedia.org.evil.test/', 'https://upload.wikimedia.org:444/', 'https://user@upload.wikimedia.org/', 'https://archive.org/download/other']) {
    calls = 0;
    const result = await playbackResponse(input, async () => { calls++; return new Response(null, { status: 302, headers: { Location: location } }); });
    assert.equal(result.body.ok, false);
    assert.equal(calls, 1);
  }
});
