import type { PlaywrightTestConfig } from "@playwright/test";
import { devices } from "@playwright/test";

declare const process: {
  env: {
    CI?: string;
  };
};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const config: PlaywrightTestConfig = {
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met.
     * For example in `await expect(locator).toHaveText();`
     */
    timeout: 5000,
  },

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Run tests in files in parallel */
  fullyParallel: true,

  /** Example specs only; single project keeps CI fast until Loadout has real E2E coverage. */
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? "dot" : "list",

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  testDir: "./tests",

  /* Maximum time one test can run for. */
  timeout: 30 * 1000,

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://localhost:3005',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "pnpm dev",
    port: 3005,
    reuseExistingServer: true,
  },

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
};

export default config;
