// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false, // sequential — single dev server shared
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'fr-FR',
  },

  projects: [
    // Global setup: logs in once and saves auth state
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
    },
    // All functional tests reuse the saved auth state
    {
      name: 'functional',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'fixtures/auth.json',
      },
      dependencies: ['setup'],
    },
  ],
});
