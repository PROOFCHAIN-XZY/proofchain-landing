import { defineConfig, devices } from '@playwright/test';

/*
 * The README claims the page was checked at 375 / 768 / 1440 in both colour
 * schemes. That claim was true when it was written and unverifiable by anyone
 * else afterwards, which on this project is the wrong kind of assertion — the
 * whole page argues that a claim should come with the means to recheck it.
 *
 * The site has no build step, so the suite serves the parent directory over
 * plain HTTP and drives it. Nothing is installed into the published site.
 */
export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL: 'http://127.0.0.1:8080',
    trace: 'on-first-failure',
  },

  webServer: {
    // python3 rather than a node server: it is the command the README already
    // tells a reader to use, so the tests exercise the documented setup.
    command: 'python3 -m http.server 8080 --directory ..',
    url: 'http://127.0.0.1:8080',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
  },

  /*
   * The breakpoint list is not arbitrary. styles.css switches layout at 40,
   * 46, 56, 62, 68 and 76rem; these four widths sit either side of those
   * boundaries, and each colour scheme is a separate project because the
   * palette is redefined wholesale under prefers-color-scheme.
   */
  projects: [
    {
      name: 'mobile-light',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } },
    },
    {
      name: 'tablet-light',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'desktop-light',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'desktop-dark',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        colorScheme: 'dark',
      },
    },
    {
      name: 'mobile-dark',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
        colorScheme: 'dark',
      },
    },
  ],
});
