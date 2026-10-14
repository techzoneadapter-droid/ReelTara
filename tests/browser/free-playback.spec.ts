import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import sources from "../../src/data/freeSources.json" with { type: "json" };

async function openMovie(page: Page, title = "Big Buck Bunny") {
  await page.route("**/api/open-catalog?**", (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Free to Watch" })
    .click();
  await page
    .getByRole("button", { name: `View ${title}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: /^(Watch Free|Resume|Watch Again)$/ })
    .click();
}
async function play(page: Page) {
  await expect
    .poll(
      () =>
        page
          .locator("video")
          .evaluate(
            async (v: HTMLVideoElement) => {
              if (!Number.isFinite(v.duration) || v.duration <= 0) return false;
              // preload=metadata can require play() before downloading more data.
              v.muted = true;
              try {
                await v.play();
                return !v.paused && v.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA;
              } catch (error) {
                // A legitimate source failover cancels the previous play request.
                if (error instanceof DOMException && error.name === 'AbortError') return false;
                throw error;
              }
            },
          ),
      // Two bounded candidates can each spend 10s probing and 20s loading.
      { timeout: 65_000 },
    )
    .toBe(true);
  const before = await page
    .locator("video")
    .evaluate((v: HTMLVideoElement) => v.currentTime);
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
    )
    .toBeGreaterThan(before + 0.3);
}

test("slow successful probe leaves a full media-loading budget and uses verified final URL", async ({ page }) => {
  test.setTimeout(45_000);
  const probes: string[] = [];
  const canonical = 'https://dn710604.ca.archive.org/0/items/BigBuckBunny_124/fixture.webm';
  // Original canvas fixture; this timing regression is independent of public CDNs.
  await page.route("**/api/playback?**", async route => {
    probes.push(new URL(route.request().url()).searchParams.get("url")!);
    await new Promise(resolve => setTimeout(resolve, 6000));
    await route.fulfill({ json: { ok: true, playbackUrl: sources.bunny.playbackUrl, finalUrl: canonical,
      candidate: { url: sources.bunny.playbackUrl, mimeType: "video/webm" } } });
  });
  await page.route(sources.bunny.playbackUrl, route => route.abort('failed'));
  await page.route(canonical, async route => {
    await new Promise(resolve => setTimeout(resolve, 12000));
    await route.fulfill({ contentType: "video/webm", body: readFileSync("tests/fixtures/progress.webm") });
  });
  await openMovie(page);
  await expect.poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime),
    {timeout:30_000}).toBeGreaterThan(0.2);
  await play(page);
  // Development StrictMode may cancel/restart the same primary probe.
  expect([...new Set(probes)]).toEqual([sources.bunny.playbackUrl]);
  expect(await page.locator('video').evaluate((v: HTMLVideoElement) => v.currentSrc)).toBe(canonical);
  await expect(page.getByText(/Playback unavailable/)).toHaveCount(0);
});

test("real legal MP4: metadata, playing, seek, pause, reload and 30-second resume", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const events: { event: string; duration?: number; currentTime?: number }[] =
    [];
  page.on("console", (message) => {
    if (message.text().startsWith("[Free Legal playback]")) {
      void message
        .args()[1]
        ?.jsonValue()
        .then((value) => events.push(value));
    }
  });
  await openMovie(page);
  await play(page);
  // Buffering time is not watched time: verify the actual media position.
  await expect.poll(() => page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
    { timeout: 45_000 }).toBeGreaterThan(30);
  await page.getByRole("button", { name: "Back to movie details" }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect
    .poll(
      () =>
        page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
      { timeout: 30_000 },
    )
    .toBeGreaterThan(29);
  await play(page);
  await page.locator("video").evaluate((v: HTMLVideoElement) => {
    v.currentTime = 30;
  });
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
    )
    .toBeGreaterThan(30.3);
  await page.locator("video").evaluate((v: HTMLVideoElement) => v.pause());
  const paused = await page
    .locator("video")
    .evaluate((v: HTMLVideoElement) => v.currentTime);
  await page.waitForTimeout(500);
  expect(
    await page
      .locator("video")
      .evaluate((v: HTMLVideoElement) => v.currentTime),
  ).toBe(paused);
  await play(page);
  await expect(
    page.locator(".player-screen").getByRole("link", { name: "View Legal Source" }),
  ).toHaveAttribute("href", sources.bunny.sourcePageUrl);
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.locator(".player-screen").getByRole("link", { name: "View Legal Source" }).click(),
  ]);
  expect(popup.url()).toContain("peach.blender.org");
  await popup.close();
  await page.getByRole("button", { name: "Back to movie details" }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "View Big Buck Bunny", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await play(page);
  expect(
    events.some((e) => e.event === "loadedmetadata" && e.duration! > 0),
  ).toBe(true);
  expect(events.some((e) => e.event === "playing")).toBe(true);
  console.log(
    "REAL_BUNNY_EVENTS",
    JSON.stringify(
      events.filter((e) => ["loadedmetadata", "playing"].includes(e.event)),
    ),
  );
});

for (const title of ["Sintel", "Tears of Steel"])
  test(`real legal MP4: ${title} plays`, async ({ page }) => {
    test.setTimeout(90_000);
    await openMovie(page, title);
    await play(page);
    if (title === "Sintel") {
      await page.locator("video").evaluate((video: HTMLVideoElement) => { video.currentTime = 30; video.pause(); });
      await expect.poll(() => page.locator("video").evaluate((video: HTMLVideoElement) => video.currentTime)).toBe(30);
      await play(page);
      await expect.poll(() => page.locator("video").evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(30.3);
      await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
      await expect.poll(() => page.evaluate(() => document.fullscreenElement?.classList.contains("player-screen"))).toBe(true);
      await page.evaluate(() => document.exitFullscreen());
      await page.screenshot({ path: ".cache/player-desktop.png" });
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeHidden();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: ".cache/player-mobile.png" });
      await page.setViewportSize({ width: 844, height: 390 });
      await page.screenshot({ path: ".cache/player-landscape.png" });
    }
    console.log(
      title,
      await page
        .locator("video")
        .evaluate((v: HTMLVideoElement) => ({
          duration: v.duration,
          currentTime: v.currentTime,
          src: v.currentSrc,
        })),
    );
  });

test("failed first media source falls back; exhaustion and Retry re-probe from first source", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const probes: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/playback?"))
      probes.push(new URL(request.url()).searchParams.get("url")!);
  });
  const primaryMedia = /https:\/\/[^/]*archive\.org\/.*BigBuckBunny_124\/.*/;
  await page.route(primaryMedia, (route) => route.abort("failed"));
  await openMovie(page);
  await play(page);
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.currentSrc),
  ).toContain("BigBuckBunny_328");
  await page.getByRole("button", { name: "Back to movie details" }).click();
  await page.route("**/api/playback?**", (route) =>
    route.fulfill({
      json: { ok: false, status: 403, contentType: "text/html" },
    }),
  );
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByText(/Playback unavailable/)).toBeVisible();
  await page.unroute("**/api/playback?**");
  await page.unroute(primaryMedia);
  probes.length = 0;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await play(page);
  expect(probes[0]).toBe(sources.bunny.playbackUrl);
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.currentSrc),
  ).toContain("BigBuckBunny_124");
});

test("a hung source probe times out after 10s and the next real MP4 plays", async ({
  page,
}) => {
  test.setTimeout(45_000);
  let firstProbeAt = 0;
  let secondProbeAt = 0;
  await page.route("**/api/playback?**", (route) => {
    const url = new URL(route.request().url()).searchParams.get("url");
    if (url === sources.bunny.playbackUrl) {
      firstProbeAt = Date.now();
      return; // Deliberately leave this request pending; the player must abort it.
    }
    secondProbeAt = Date.now();
    return route.continue();
  });
  await openMovie(page);
  await play(page);
  expect(secondProbeAt - firstProbeAt).toBeGreaterThanOrEqual(9500);
  expect(secondProbeAt - firstProbeAt).toBeLessThan(13_000);
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.currentSrc),
  ).toContain("BigBuckBunny_328");
});
