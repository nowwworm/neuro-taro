const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['line'],
        ['allure-playwright', {
            detail: true,
            outputFolder: 'allure-results',
            suiteTitle: false,
        }],
    ],
    use: {
        // We can point to the local server or Netlify.
        // The Netlify one has infinite energy mock setup in the code
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        video: 'on',
        viewport: { width: 390, height: 844 }, // Mobile aspect ratio
    },

    projects: [
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        }
    ],
});
