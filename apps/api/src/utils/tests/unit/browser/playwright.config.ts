import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: '.',
    timeout: 30_000,
    retries: 0,
    reporter: process.env.CI ? 'json' : 'list',
    use: {
        baseURL: 'http://localhost:3000',
        headless: true,
        screenshot: 'only-on-failure',
        trace: 'off',
    },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' },
        },
    ],
    // Do NOT start servers — they must already be running
    webServer: undefined,
});
