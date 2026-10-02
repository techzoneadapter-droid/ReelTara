import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { mockYouTube } from "./youtube-fixture";
async function openTrailer(page: Page) {
  await page.route("**/api/tmdb?**", route => route.fulfill({ status: 503, json: {} }));
  await mockYouTube(page);
  await page.goto("/");
  await page.getByRole("button", { name: "View Dune: Part Two", exact: true }).first().click();
  await expect(page.getByText("Loading movie details…")).toHaveCount(0);
  await page.getByRole("button", { name: "Watch Trailer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
}
async function state(page: Page, value: number) {
  await page.evaluate(value => {
    (window as unknown as { fixturePlayer: { change(value: number): void } }).fixturePlayer.change(value);
  }, value);
}
async function assertUnobstructed(page: Page) {
  const frame = await page.locator(".player-screen iframe").boundingBox();
  expect(frame).toBeTruthy();
  expect(frame!.height).toBeGreaterThanOrEqual(200);
  for (const selector of [".player-topbar", ".trailer-control-rail", ".trailer-error"]) {
    if (await page.locator(selector).count() === 0) continue;
    const area = await page.locator(selector).boundingBox();
    if (area) expect(area.y >= frame!.y + frame!.height - 1 || area.y + area.height <= frame!.y + 1).toBe(true);
  }
  expect(await page.locator("iframe").evaluate(el => getComputedStyle(el).pointerEvents)).toBe("auto");
}

test("Dune custom controls: supported vars, time, pause, seek, volume, states, fullscreen, Back", async ({ page }) => {
  await openTrailer(page);
  const frame = page.locator(".player-screen iframe");
  const url = new URL((await frame.getAttribute("src"))!);
  for (const [key, value] of Object.entries({ controls: "0", playsinline: "1", rel: "0", enablejsapi: "1" })) expect(url.searchParams.get(key)).toBe(value);
  expect(url.searchParams.has("modestbranding")).toBe(false);
  await expect(frame).toHaveAttribute("allow", "autoplay; encrypted-media; picture-in-picture; fullscreen");
  await expect(page.locator(".player-screen h1")).toHaveCount(0);
  await expect(page.locator(".player-screen a")).toHaveCount(0);
  await assertUnobstructed(page);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".trailer-player")).toHaveAttribute("data-player-state", "playing");
  await expect.poll(() => page.getByRole("slider", { name: "Trailer progress" }).inputValue()).not.toBe("0");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator(".trailer-player")).toHaveAttribute("data-player-state", "paused");
  const paused = await page.getByRole("slider", { name: "Trailer progress" }).inputValue();
  await page.waitForTimeout(500);
  expect(await page.getByRole("slider", { name: "Trailer progress" }).inputValue()).toBe(paused);
  await page.getByRole("slider", { name: "Trailer progress" }).fill("40");
  await page.getByRole("slider", { name: "Trailer progress" }).blur();
  await expect(page.getByRole("slider", { name: "Trailer progress" })).toHaveValue("40");
  await page.getByRole("button", { name: "Back to movie details" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("slider", { name: "Trailer progress" })).toHaveValue("50");
  await page.keyboard.press("j");
  await expect(page.getByRole("slider", { name: "Trailer progress" })).toHaveValue("40");
  await page.keyboard.press("l");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("slider", { name: "Trailer progress" })).toHaveValue("40");
  await page.locator(".trailer-control-rail").dblclick({ position: { x: 10, y: 20 } });
  await expect(page.getByRole("slider", { name: "Trailer progress" })).toHaveValue("30");
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await expect(page.getByRole("button", { name: "Unmute", exact: true })).toBeVisible();
  await page.getByRole("slider", { name: "Volume", exact: true }).fill("35");
  await expect(page.getByRole("button", { name: "Mute", exact: true })).toBeVisible();
  await state(page, 3);
  await expect(page.getByLabel("Buffering", { exact: true })).toBeVisible();
  await assertUnobstructed(page);
  await state(page, 0);
  await expect(page.getByRole("button", { name: "Replay", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.className)).toContain("player-screen");
  await expect(page.getByRole("slider", { name: "Trailer progress" })).toHaveValue("30");
  await assertUnobstructed(page);
  await page.screenshot({ path: ".cache/trailer-custom-fullscreen.png" });
  await page.getByRole("button", { name: "Exit fullscreen", exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await page.getByRole("button", { name: "Back to movie details" }).focus();
  await expect(page.locator(".controls-hidden")).toBeVisible();
  await page.locator(".trailer-control-rail").hover();
  await expect(page.locator(".controls-hidden")).toHaveCount(0);
  await page.getByRole("button", { name: "Back to movie details" }).click();
  await expect(page.getByRole("heading", { name: "Dune: Part Two", exact: true })).toBeVisible();
});

test("YouTube error fallback remains outside iframe; Retry restores player; mobile double tap", async ({ page }) => {
  await openTrailer(page);
  await page.evaluate(() => {
    (window as unknown as { fixturePlayer: { options: { events: { onError(event: { data: number }): void } } } }).fixturePlayer.options.events.onError({ data: 150 });
  });
  await state(page, -1);
  await expect(page.locator(".trailer-player")).toHaveAttribute("data-player-state", "error");
  await expect(page.getByRole("link", { name: "Open original source" })).toBeVisible();
  await assertUnobstructed(page);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeEnabled();
  await expect(page.locator(".player-screen a")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("slider", { name: "Trailer progress" }).fill("30");
  await page.getByRole("slider", { name: "Trailer progress" }).blur();
  const rail = page.locator(".trailer-control-rail");
  for (let i = 0; i < 2; i++) await rail.dispatchEvent("pointerup", { pointerType: "touch", clientX: 380 });
  await expect(page.getByRole("slider", { name: "Trailer progress" })).toHaveValue("40");
  await assertUnobstructed(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: ".cache/trailer-custom-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: ".cache/trailer-custom-desktop.png" });
  await page.setViewportSize({ width: 844, height: 390 });
  await assertUnobstructed(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: ".cache/trailer-custom-landscape.png" });
  await page.locator(".player-screen").evaluate(element => { Object.defineProperty(element, "requestFullscreen", { value: undefined, configurable: true }); });
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await expect(page.locator(".trailer-immersive")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".trailer-immersive")).toHaveCount(0);
  await expect(page.locator(".player-screen")).toBeVisible();
});

test("verified direct trailer uses HTML5 and the same custom controls", async ({ page }) => {
  await openTrailer(page);
  const directUrl = "https://download.blender.org/test/authorized-trailer.webm";
  const media = readFileSync("tests/fixtures/progress.webm");
  await page.route(directUrl, route => {
    const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range || "");
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Math.min(Number(range[2]), media.length - 1) : media.length - 1;
    return route.fulfill({ status: range ? 206 : 200, contentType: "video/webm",
      headers: { "Accept-Ranges": "bytes", "Content-Length": String(end - start + 1),
        ...(range ? { "Content-Range": `bytes ${start}-${end}/${media.length}` } : {}) },
      body: media.subarray(start, end + 1) });
  });
  await page.evaluate(url => {
    const previous = history.state;
    const movie = { ...previous.movie, trailer: { id: "direct-fixture", provider: "direct", official: true, verified: true,
      sourceName: "Authorized test fixture", sourcePageUrl: "https://peach.blender.org/", directPlaybackUrl: url, mimeType: "video/webm", type: "Trailer", name: "Official Trailer" } };
    const next = { ...previous, movie };
    history.replaceState(next, "");
    window.dispatchEvent(new PopStateEvent("popstate", { state: next }));
  }, directUrl);
  await expect(page.locator(".player-screen iframe")).toHaveCount(0);
  await expect(page.locator("video")).toBeVisible();
  expect(await page.locator("video").evaluate((v: HTMLVideoElement) => v.controls)).toBe(false);
  await expect(page.getByRole("button", { name: "Mute", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Mute", exact: true }).click();
  await page.locator("video").evaluate(async (v: HTMLVideoElement) => { await v.play(); });
  await expect.poll(() => page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(.2);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("slider", { name: "Trailer progress" }).fill("0.5");
  await page.getByRole("slider", { name: "Trailer progress" }).blur();
  await expect.poll(() => page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime)).toBeCloseTo(.5, 1);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => page.locator("video").evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(.6);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator(".trailer-player")).toHaveAttribute("data-player-state", "paused");
  await page.getByRole("button", { name: "Fullscreen", exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.className)).toContain("player-screen");
  await page.getByRole("button", { name: "Exit fullscreen", exact: true }).click();
});
