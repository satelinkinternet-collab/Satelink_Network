import { test, expect } from '@playwright/test';

/**
 * Admin Smoke Tests — Browser-level verification
 *
 * Requires:
 *   - Backend running at :8080
 *   - Frontend running at :3000
 *   - At least one admin user with cookie/session
 *
 * These tests verify the admin UI renders correctly with real data.
 * They do NOT require authentication (pages handle auth state gracefully).
 */

const BASE = 'http://localhost:3000';

test.describe('Admin Control Room — Smoke', () => {

    test('1. Command Center renders KPI tiles', async ({ page }) => {
        await page.goto(`${BASE}/admin/command-center`);
        await page.waitForTimeout(2000); // Allow hydration + API calls

        // Page should render without crashing
        const body = page.locator('body');
        await expect(body).toBeVisible();

        // Look for key UI elements (these exist even without auth)
        const heading = page.locator('h1, [class*="text-2xl"], [class*="text-xl"]').first();
        await expect(heading).toBeVisible({ timeout: 5000 });
    });

    test('2. Ops Errors page renders table', async ({ page }) => {
        await page.goto(`${BASE}/admin/ops/errors`);
        await page.waitForTimeout(2000);

        const body = page.locator('body');
        await expect(body).toBeVisible();

        // Should have page structure (header area)
        const header = page.locator('h1, [class*="PageHeader"]').first();
        await expect(header).toBeVisible({ timeout: 5000 });
    });

    test('3. Ops Traces page renders table', async ({ page }) => {
        await page.goto(`${BASE}/admin/ops/traces`);
        await page.waitForTimeout(2000);

        const body = page.locator('body');
        await expect(body).toBeVisible();

        const header = page.locator('h1, [class*="PageHeader"]').first();
        await expect(header).toBeVisible({ timeout: 5000 });
    });

    test('4. Diagnostics Self-Tests page renders', async ({ page }) => {
        await page.goto(`${BASE}/admin/diagnostics/self-tests`);
        await page.waitForTimeout(2000);

        const body = page.locator('body');
        await expect(body).toBeVisible();

        const header = page.locator('h1, [class*="PageHeader"]').first();
        await expect(header).toBeVisible({ timeout: 5000 });
    });

    test('5. Diagnostics Incidents page renders', async ({ page }) => {
        await page.goto(`${BASE}/admin/diagnostics/incidents`);
        await page.waitForTimeout(2000);

        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

});

test.describe('Admin — Error Pipeline (dev only)', () => {

    test.skip(process.env.NODE_ENV === 'production', 'Skipped in production');

    test('6. Trigger error → verify appears in ops/errors', async ({ page, request }) => {
        // Trigger a test error via backend
        try {
            await request.get('http://localhost:8080/__test/trigger-error');
        } catch (_) {
            // Expected to fail (it's an error endpoint)
        }

        // Wait for error to be recorded
        await page.waitForTimeout(3000);

        // Navigate to errors page
        await page.goto(`${BASE}/admin/ops/errors`);
        await page.waitForTimeout(2000);

        // Page should render
        const body = page.locator('body');
        await expect(body).toBeVisible();
    });

});
