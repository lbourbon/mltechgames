import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  workers: 1,
  timeout: 120_000,
  // No CI, cada teste que falha vira uma anotação na execução, e o rastro dele fica guardado.
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    trace: process.env.CI ? "retain-on-failure" : "off",
    baseURL: "http://127.0.0.1:4329",
    channel: process.env.CI ? undefined : "chrome",
    viewport: { width: 412, height: 860 },
    permissions: ["clipboard-read", "clipboard-write"],
  },
  webServer: {
    command: "PUBLIC_EMULADOR=1 astro build && wrangler dev --config wrangler.e2e.jsonc --port 4329 --ip 127.0.0.1",
    url: "http://127.0.0.1:4329",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
