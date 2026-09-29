import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/public",
  testMatch: "**/*.spec.ts",
  workers: 1,
  use: {
    baseURL: "http://localhost:3201",
    browserName: "chromium",
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
  },
  webServer: [
    {
      command: "npx tsx tests/fixtures/public-service.ts",
      url: "http://127.0.0.1:3301/__stats",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --port 3201",
      url: "http://localhost:3201/hunar",
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        HUNAR_PUBLIC_TEST: "1",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:3301",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "fixture-public-key",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3201",
        SUPABASE_SERVICE_ROLE_KEY: "fixture-service-secret",
        PUBLIC_ACTION_SECRET:
          "fixture-only-secret-with-more-than-32-characters",
        PUBLIC_ACTION_IP_HEADER: "",
      },
    },
  ],
});
