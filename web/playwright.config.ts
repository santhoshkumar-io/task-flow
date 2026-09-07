import { defineConfig, devices } from "@playwright/test";

// End-to-end tests: a real browser, against the real API, over a real cookie.
//
// The 196 server tests call Express in-process with supertest — no port, no
// browser. The 7 web tests run in jsdom with the API module mocked, so nothing
// leaves Node. Between them they cannot see a missing auth cookie, a CORS
// header, a route guard that lets somebody through, or a form that submits and
// never reaches the server. That gap is what these fill.

const WEB = "http://localhost:5173";
const API = "http://localhost:4000";

export default defineConfig({
  testDir: "./e2e",

  // Vitest's include is 'src/**/*.test.{ts,tsx}' (see vite.config.ts), so
  // keeping these outside src/ means the two runners can never pick up each
  // other's files.
  fullyParallel: false,
  workers: 1,
  // One shared database. Tests that create and delete tasks in parallel would
  // trip over each other, and the failure looks like a product bug rather than
  // a test-setup bug — which is the expensive kind of flake.

  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: WEB,

    // web/src/index.css already has a prefers-reduced-motion block that turns
    // off the 220ms drawer slide, the 180ms dialog fade and the INFINITE
    // skeleton pulse. Asking for it removes every timed animation from the run
    // rather than waiting each one out.
    reducedMotion: "reduce",

    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      // Everything except the phone spec, which is written for 390px.
      testIgnore: /mobile.spec.ts/,
      use: {
        ...devices["Desktop Chrome"],
        // Pinned. The app mounts the desktop table AND the mobile card stack at
        // the same time and hides one with CSS, so at an unpinned width half
        // the selectors match twice.
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      // The phone frames from the design reference: 390 × 844, section 8.4.
      //
      // Everything above runs at one desktop width and is therefore blind to
      // the tab bar, the navigation sheet, the filter sheet and the docked
      // comment box — all of which exist only below 768px.
      name: "mobile",
      testMatch: /mobile.spec.ts/,
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
      },
    },
  ],

  webServer: [
    {
      // Not `npm run dev` — that reads server/.env and would point the tests at
      // the real database, which the seed deletes. dev:e2e starts a MongoDB of
      // its own. See server/src/e2e-server.ts.
      command: "npm run dev:e2e",
      cwd: "../server",
      url: `${API}/api/health`,
      // Always a fresh, freshly seeded database — never whatever the last run
      // left behind.
      reuseExistingServer: false,
      // Starting an in-memory MongoDB and hashing the seed passwords with
      // bcrypt at cost 12 takes about 40 seconds on a cold cache.
      timeout: 180_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "npm run dev",
      url: WEB,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      // vite.config.ts sets strictPort, so a stale process on 5173 fails the
      // run instead of quietly moving to 5174 and breaking CORS. That is the
      // behaviour we want — the server's CORS_ORIGIN names this exact port.
    },
  ],
});
