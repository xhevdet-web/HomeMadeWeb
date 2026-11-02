import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end checks with a mocked API (tests/mockApi.ts). The site runs on its own Vite server
 * pointed at a fake API host, so the real backend is never called. Uses the installed Chrome.
 */
const PORT = 5174;

export default defineConfig({
  testDir: "tests",
  timeout: 45_000,
  // The first pages wait for Vite to optimise dependencies on a cold start.
  expect: { timeout: 15_000 },
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}/`,
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "Desktop Chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "Pixel 7", use: { ...devices["Pixel 7"], channel: "chrome" } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    env: { VITE_API_URL: "http://api.test/api/v1", VITE_GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com" },
  },
});
