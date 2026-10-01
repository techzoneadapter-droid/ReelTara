import chromium from "@sparticuz/chromium";
import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4174",
    viewport: { width: 1440, height: 900 },
    headless: true,
    launchOptions: {
      executablePath: resolve(".cache/browser/chromium"),
      args: chromium.args.filter(
        (arg) =>
          ![
            "--disable-web-security",
            "--single-process",
            "--allow-running-insecure-content",
            "--disable-site-isolation-trials",
          ].includes(arg),
      ),
      env: {
        LD_LIBRARY_PATH: resolve(".cache/browser/lib"),
        FONTCONFIG_PATH: resolve(".cache/browser"),
        TMPDIR: resolve(".cache/tmp"),
      },
    },
  },
  webServer: {
    command: "npm run dev -- --port 4174",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
  },
});
