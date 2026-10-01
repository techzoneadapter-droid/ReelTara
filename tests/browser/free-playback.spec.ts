import { test, expect, type Page } from "@playwright/test";
import sources from "../../src/data/freeSources.json" with { type: "json" };

async function openMovie(page: Page, title = "Big Buck Bunny") {
  await page.route("**/api/tmdb?**", (route) =>
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
            (v: HTMLVideoElement) =>
              Number.isFinite(v.duration) && v.duration > 0,
          ),
      { timeout: 30_000 },
    )
    .toBe(true);
  await page.locator("video").evaluate(async (v: HTMLVideoElement) => {
    v.muted = true;
    await v.play();
  });
  const before = await page
    .locator("video")
    .evaluate((v: HTMLVideoElement) => v.currentTime);
  await expect
    .poll(() =>
      page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
    )
    .toBeGreaterThan(before + 0.3);
}

test("real legal MP4: metadata, playing, seek, pause, reload and 25-second resume", async ({
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
  await page.waitForTimeout(25_000);
  await page.getByRole("button", { name: "Close player" }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect
    .poll(
      () =>
        page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime),
      { timeout: 30_000 },
    )
    .toBeGreaterThan(24);
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
    page.getByRole("dialog").getByRole("link", { name: "View Source" }),
  ).toHaveAttribute("href", sources.bunny.sourcePageUrl);
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("dialog").getByRole("link", { name: "View Source" }).click(),
  ]);
  expect(popup.url()).toContain("peach.blender.org");
  await popup.close();
  await page.getByRole("button", { name: "Close player" }).click();
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
    test.setTimeout(60_000);
    await openMovie(page, title);
    await play(page);
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
  await page.route(sources.bunny.playbackUrl, (route) => route.abort("failed"));
  await openMovie(page);
  await play(page);
  expect(
    await page.locator("video").evaluate((v: HTMLVideoElement) => v.currentSrc),
  ).toContain("BigBuckBunny_328");
  await page.getByRole("button", { name: "Close player" }).click();
  await page.route("**/api/playback?**", (route) =>
    route.fulfill({
      json: { ok: false, status: 403, contentType: "text/html" },
    }),
  );
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByText(/Playback unavailable/)).toBeVisible();
  await page.unroute("**/api/playback?**");
  await page.unroute(sources.bunny.playbackUrl);
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
