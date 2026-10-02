import { readFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { mockYouTube } from "./youtube-fixture";
const fixtureMovie = {
  id: 101,
  title: "Fixture Film",
  release_date: "2026-01-02",
  vote_average: 8.2,
  overview: "A test film overview.",
  genre_ids: [18],
  poster_path: null,
  backdrop_path: null,
};
async function fallback(page: Page) {
  await page.route("**/api/tmdb?**", (route) =>
    route.fulfill({ status: 503, json: { error: "api_unavailable" } }),
  );
  await page.route("**/api/playback?**", route => route.fulfill({ json: { ok: true, status: 206, contentType: "video/mp4" } }));
  await page.route("**/api/archive?**", (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await mockYouTube(page);
}
async function live(page: Page, missing = false) {
  await page.route("**/api/tmdb?**", (route) => {
    const url = new URL(route.request().url());
    const path = url.searchParams.get("path");
    let json: unknown;
    if (path === "genre/movie/list")
      json = { genres: [{ id: 18, name: "Drama" }] };
    else if (path?.endsWith("/watch/providers"))
      json = {
        results: missing
          ? {}
          : {
              IN: {
                link: "https://www.themoviedb.org/movie/101/watch?locale=IN",
                flatrate: [{ provider_id: 1, provider_name: "India Provider" }],
              },
              PH: {
                link: "https://www.themoviedb.org/movie/101/watch?locale=PH",
                rent: [
                  { provider_id: 2, provider_name: "Philippines Provider" },
                ],
              },
            },
      };
    else if (path === "movie/101")
      json = {
        ...fixtureMovie,
        runtime: 120,
        genres: [{ id: 18, name: "Drama" }],
        credits: {
          cast: [{ id: 1, name: "Actor" }],
          crew: [{ id: 2, name: "Director", job: "Director" }],
        },
        videos: {
          results: missing
            ? []
            : [
                {
                  id: "trailer",
                  key: "abcdefghijk",
                  site: "YouTube",
                  official: true,
                  type: "Trailer",
                  name: "Official Trailer",
                },
              ],
        },
      };
    else json = { results: [fixtureMovie] };
    return route.fulfill({ json });
  });
}
test("A: Home → Trending → Detail → trailer → close → back restores scroll", async ({
  page,
}) => {
  await fallback(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByText("Live API unavailable. Browsing the curated catalog."),
  ).toBeVisible();
  await page.screenshot({ path: ".cache/home-desktop.png", fullPage: true });
  await page
    .getByRole("heading", { name: "Trending Now" })
    .scrollIntoViewIfNeeded();
  await page
    .getByRole("button", { name: "View Oppenheimer", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Oppenheimer", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Watch Trailer", exact: true })
    .click();
  await expect(page.locator(".player-screen")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeHidden();
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    /youtube-nocookie.com\/embed\/uYPbbksJxIg/,
  );
  await page.getByRole("button", { name: "Back to movie details" }).click();
  await expect(page.locator(".player-screen")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Oppenheimer", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to exploring" }).click();
  await expect(
    page.getByRole("heading", { name: "Trending Now" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("B/C: debounced search survives detail/back and watchlist survives reload", async ({
  page,
}) => {
  await fallback(page);
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Search movies", exact: true })
    .fill("Interstellar");
  await page
    .getByRole("button", { name: "View Interstellar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "My Watchlist", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Back to exploring" }).click();
  await expect(
    page.getByRole("textbox", { name: "Search catalog" }),
  ).toHaveValue("Interstellar");
  await expect(
    page.getByRole("button", { name: "View Interstellar", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: /My Watchlist/ })
    .click();
  await expect(
    page.getByRole("button", { name: "View Interstellar", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove Interstellar", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: /My Watchlist/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your next favorite belongs here." }),
  ).toBeVisible();
});
test("D: real HTML video controls save and resume progress; completed movies restart", async ({
  page,
}) => {
  await fallback(page);
  await page.goto("/");
  // Original 32px canvas recording, remuxed with finite duration and seek metadata.
  const media = readFileSync("tests/fixtures/progress.webm");
  await page.route("https://archive.org/download/**", (route) => {
    const range = /bytes=(\d+)-(\d*)/.exec(
      route.request().headers().range || "",
    );
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2]
      ? Math.min(Number(range[2]), media.length - 1)
      : media.length - 1;
    return route.fulfill({
      status: range ? 206 : 200,
      contentType: "video/webm",
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": String(end - start + 1),
        ...(range
          ? { "Content-Range": `bytes ${start}-${end}/${media.length}` }
          : {}),
      },
      body: media.subarray(start, end + 1),
    });
  });
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Free to Watch" })
    .click();
  await page.getByRole("button", { name: "View Big Buck Bunny" }).click();
  await expect(page.getByText("Loading movie details…")).toHaveCount(0);
  await page.getByRole("button", { name: "Watch Free", exact: true }).click();
  await page.locator("video").evaluate(async (element: HTMLVideoElement) => {
    await element.play();
  });
  await page.waitForTimeout(600);
  await page.locator("video").evaluate((element: HTMLVideoElement) => {
    element.pause();
  });
  await page.getByRole("button", { name: "Back to movie details" }).click();
  await expect(
    page.getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("reeltara-user-v1")!).progress.bunny
        .currentTime,
  );
  expect(saved).toBeGreaterThan(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Continue Watching", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "View Big Buck Bunny", exact: true })
    .first()
    .click();

  await page.getByRole("button", { name: "Resume", exact: true }).click();

  await expect
    .poll(() =>
      page.locator("video").evaluate((e: HTMLVideoElement) => e.currentTime),
    )
    .toBeGreaterThan(0);
  await page.locator("video").evaluate((video: HTMLVideoElement) => video.pause());
  await page.getByLabel("Player settings", { exact: true }).click();
  await page.getByRole("button", { name: "Restart" }).click();
  expect(
    await page
      .locator("video")
      .evaluate((e: HTMLVideoElement) => e.currentTime),
  ).toBe(0);
  await page.locator("video").evaluate(async (e: HTMLVideoElement) => {
    await e.play();
  });
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Back to movie details" }).click();
  await expect(
    page.getByRole("button", { name: "Watch Again", exact: true }),
  ).toBeVisible();
});
test("E/F: IN and PH providers follow persisted preference", async ({
  page,
}) => {
  await live(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Fixture Film", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Explore the story" }).click();
  await expect(
    page.getByRole("link", { name: "India Provider · subscription" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Your profile", exact: true }).click();
  await page.getByLabel("Country", { exact: true }).selectOption("PH");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Home", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Fixture Film", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Explore the story" }).click();
  await expect(
    page.getByRole("link", { name: "Philippines Provider · rent" }),
  ).toHaveAttribute("href", /locale=PH/);
  await expect(
    page.getByRole("link", { name: "India Provider · subscription" }),
  ).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Your profile", exact: true }).click();
  await expect(page.getByLabel("Country", { exact: true })).toHaveValue("PH");
});
test("G/H: malformed API and absent artwork/trailer/providers remain usable", async ({
  page,
}) => {
  await live(page, true);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Fixture Film", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Explore the story" }).click();
  await expect(
    page.getByText("Trailer unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No providers listed for this country."),
  ).toBeVisible();
  await expect(page.locator(".detail-poster .image-fallback")).toBeVisible();
  await page.getByRole("button", { name: "Back to exploring" }).click();
  await page.route("**/api/tmdb?**", (route) =>
    route.fulfill({ json: { unexpected: true } }),
  );
  await page
    .getByRole("textbox", { name: "Search movies", exact: true })
    .fill("Fixture");
  await expect(
    page.getByText(
      "Search API unavailable. Showing matching saved catalog titles.",
    ),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile layout remains within viewport and bottom tabs keep search state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fallback(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Open search", exact: true }).click();
  await page.getByRole("textbox", { name: "Search catalog" }).fill("Dune");
  await page
    .getByRole("button", { name: "View Dune: Part Two", exact: true })
    .click();
  await page.goBack();
  await expect(
    page.getByRole("textbox", { name: "Search catalog" }),
  ).toHaveValue("Dune");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".cache/search-mobile.png", fullPage: true });
});

test("source-only films and playback errors offer a legal way back", async ({
  page,
}) => {
  await fallback(page);
  await page.route("https://archive.org/download/**", (route) =>
    route.fulfill({ status: 403, body: "Unavailable" }),
  );
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Free to Watch" })
    .click();
  await page.getByRole("button", { name: "View Sintel", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Watch Free", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "View Legal Source", exact: true }).first(),
  ).toHaveAttribute("href", "https://durian.blender.org/");
  await page.getByRole("button", { name: "Back to exploring" }).click();
  await page
    .getByRole("button", { name: "View Big Buck Bunny", exact: true })
    .click();
  await page.getByRole("button", { name: "Watch Free", exact: true }).click();
  await expect(
    page.getByText("Playback unavailable. Retry or view the official source."),
  ).toBeVisible();
  await expect(
    page.locator(".player-screen").getByRole("link", { name: "View Legal Source" }),
  ).toHaveAttribute("href", "https://peach.blender.org/");
  await page.keyboard.press("Escape");
  await expect(page.locator(".player-screen")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Big Buck Bunny", exact: true }),
  ).toBeVisible();
});

test("provider picker groups availability and confirms the actual outbound destination", async ({
  page,
}) => {
  await live(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Fixture Film", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Explore the story" }).click();
  await expect(page.getByText("Loading movie details…")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Where to Watch", exact: true })
    .click();
  const picker = page.getByRole("dialog", {
    name: "Where to Watch",
    exact: true,
  });
  await expect(
    picker.getByRole("heading", { name: "Streaming", exact: true }),
  ).toBeVisible();
  await picker
    .getByRole("button", { name: "India Provider · subscription" })
    .click();
  await expect(picker.getByText(/You'll continue to TMDB/)).toBeVisible();
  await expect(
    picker.getByRole("link", { name: "Continue to availability page" }),
  ).toHaveAttribute("href", /locale=IN/);
  await expect(page.locator("video")).toHaveCount(0);
  await picker.getByRole("button", { name: "Close providers" }).click();
  await expect(
    page.getByRole("heading", { name: "Fixture Film", exact: true }),
  ).toBeVisible();
});

test("Dune trailer is a standalone screen; browser Back restores detail scroll and providers stay external", async ({ page }) => {
  await fallback(page);
  await page.goto("/");
  await page.getByRole("button", { name: "View Dune: Part Two", exact: true }).first().click();
  await expect(page.getByText("Loading movie details…")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Watch Free", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Watch Trailer", exact: true }).focus();
  await page.evaluate(() => window.scrollTo(0, 150));
  const scroll = await page.evaluate(() => scrollY);
  await page.getByRole("button", { name: "Watch Trailer", exact: true }).press("Enter");
  await expect(page.locator(".player-screen")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeHidden();
  await expect(page.locator(".player-screen iframe")).toHaveAttribute("src", /youtube-nocookie.com\/embed\/Way9Dexny3w/);
  await expect(page.locator("video")).toHaveCount(0);
  await page.goBack();
  await expect(page.locator(".player-screen")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(scroll);
  await expect(page.getByRole("heading", { name: "Dune: Part Two", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Apple TV/ }).first()).toHaveAttribute("href", /https:\/\/tv.apple.com\//);
  await page.goForward();
  await expect(page.locator(".player-screen iframe")).toBeVisible();
  await page.getByRole("button", { name: "Back to movie details" }).click();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
});
