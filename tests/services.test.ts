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
    key: "abcdefghijk",
    site: "YouTube" as const,
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
      { ...base, key: "<script>", type: "Trailer", official: true },
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
